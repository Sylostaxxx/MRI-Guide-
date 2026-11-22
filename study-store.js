(() => {
  const version = 1;
  let connection;
  function open() {
    connection ??= new Promise((resolve,reject) => {
      const request = indexedDB.open('mri-study-lab-continuous',version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('attempts')) {
          db.createObjectStore('attempts',{keyPath:'id'});
          db.createObjectStore('records',{keyPath:'id'});
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {request.result.close();connection = null;};
        resolve(request.result);
      };
      request.onerror = () => {connection = null;reject(request.error);};
      request.onblocked = () => {connection = null;reject(Error('Close other Study Lab windows to update study storage.'));};
    });
    return connection;
  }
  async function snapshot() {
    const db = await open();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(['attempts','records']);
      const attempts = tx.objectStore('attempts').getAll();
      const records = tx.objectStore('records').getAll();
      tx.oncomplete = () => resolve({version,attempts:attempts.result,records:records.result});
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
  async function write(record, attempt) {
    const db = await open();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(['attempts','records'],'readwrite');
      if (record) tx.objectStore('records').put(record);
      if (attempt) tx.objectStore('attempts').add(attempt);
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
  const str = value => typeof value === 'string' && value.length > 0;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const modes = ['continuous','lesson','retry','legacy-tutor'];
  const indexes = values => Array.isArray(values) && values.every(n => Number.isInteger(n) && n >= 0);
  function validAttempt(a) {
    return object(a) && [a.id,a.question,a.version,a.topic,a.subject,a.session].every(str) &&
      modes.includes(a.mode) && Number.isFinite(a.at) && a.at >= 0 &&
      Number.isFinite(a.ms) && a.ms >= 0 && indexes(a.response) &&
      typeof a.correct === 'boolean' && typeof a.hint === 'boolean';
  }
  function validate(data) {
    if (!object(data) || data.version !== version || !Array.isArray(data.attempts) || !Array.isArray(data.records)) throw Error('Invalid continuous study backup.');
    if (data.attempts.some(attempt=>!validAttempt(attempt))) throw Error('Invalid practice attempt.');
    for (const row of data.records) {
      if (!object(row) || !str(row.id) || !object(row.value) || !Number.isFinite(row.at)) throw Error('Invalid study record.');
      const value = row.value;
      if (/^session(?::(?:lesson|retry):[a-z0-9-]+)?$/.test(row.id)) {
        const hasResult = value.result !== null;
        if (!str(value.id) || !['continuous','lesson','retry'].includes(value.mode) ||
            !Array.isArray(value.recent) || !value.recent.every(str) ||
            !Array.isArray(value.queue) || !value.queue.every(str) || !indexes(value.order) ||
            (value.draft !== undefined && !indexes(value.draft)) ||
            (value.current !== null && !str(value.current)) ||
            (hasResult && (!validAttempt(value.result) || value.result.question !== value.current || value.result.session !== value.id)) ||
            !Number.isInteger(value.number) || value.number < 1 ||
            !Number.isFinite(value.elapsed) || value.elapsed < 0 || !str(value.subject) || !str(value.difficulty) ||
            !['paused','ended','hint'].every(field=>typeof value[field] === 'boolean')) throw Error('Invalid saved session.');
      } else if (row.id === 'reset') {
        if (!Number.isFinite(value.at)) throw Error('Invalid mastery reset.');
      } else if (/^lesson:[a-z0-9-]+$/.test(row.id)) {
        if (typeof value.bookmarked !== 'boolean' || typeof value.complete !== 'boolean') throw Error('Invalid lesson progress.');
      } else if (/^bookmark:[a-z0-9-]+$/.test(row.id)) {
        if (typeof value.bookmarked !== 'boolean') throw Error('Invalid question bookmark.');
      } else throw Error('Unknown study record.');
    }
    return data;
  }
  async function merge(data) {
    if (data == null) return;
    validate(data);
    const db = await open();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(['attempts','records'],'readwrite');
      for (const [name, incoming] of [['attempts',data.attempts],['records',data.records]]) {
        const store = tx.objectStore(name);
        for (const row of incoming) {
          const request = store.get(row.id);
          request.onsuccess = () => {
            const local = request.result;
            if (!local || (name === 'records' && !row.id.startsWith('session') && row.at > local.at)) store.put(row);
          };
        }
      }
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
  function note(region,body) {
    const key = 'mri-study-lab-v1';
    const notebook = JSON.parse(localStorage.getItem(key) ?? '{"version":1,"notes":[]}');
    notebook.notes.unshift({id:crypto.randomUUID(),region,body,created:new Date().toISOString()});
    localStorage.setItem(key,JSON.stringify(notebook));
  }
  globalThis.StudyStore = {snapshot,write,merge,validate,note};
})();
