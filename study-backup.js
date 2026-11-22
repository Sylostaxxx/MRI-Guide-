(() => {
  const notebook = 'mri-study-lab-v1';
  const review = 'mri-study-lab-review-v1';
  const scanPrefix = 'mri.scan.note.';
  const drawingPrefix = 'mri.atlas.drawing.';
  const bookmarkPrefix = 'mri.atlas.bookmark.';
  const layerPrefix = 'mri.atlas.layers.';

  function read(storage) {
    const scanNotes = Object.create(null);
    const drawings = Object.create(null);
    const layers = Object.create(null);
    const bookmarks=Object.create(null);
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key.startsWith(scanPrefix)) scanNotes[key] = storage.getItem(key);
      if (key.startsWith(drawingPrefix)) drawings[key] = JSON.parse(storage.getItem(key));
      if (key.startsWith(bookmarkPrefix)) bookmarks[key]=storage.getItem(key);
      if (key.startsWith(layerPrefix)) layers[key] = JSON.parse(storage.getItem(key));
    }
    return {
      notes: JSON.parse(storage.getItem(notebook) ?? '{"notes":[]}').notes,
      history: JSON.parse(storage.getItem(review) ?? '[]'),
      scanNotes,
      drawings,
      layers,
      bookmarks
    };
  }

  function validateMap(value, prefix, valid) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.entries(value).some(([key, item]) => !key.startsWith(prefix) || !valid(item))) {
      throw Error('Invalid backup records.');
    }
  }

  function validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid backup file.');
    if (Object.keys(data).length && Object.keys(data).every(key => key.startsWith(scanPrefix))) {
      data = { notes: [], scanNotes: data };
    }
    const { notes, history = [], scanNotes = {}, drawings = {}, layers = {}, bookmarks = {} } = data;
    if (!Array.isArray(notes) || notes.some(note => !note ||
        !['id', 'region', 'body'].every(field => typeof note[field] === 'string') ||
        !note.id || !note.region)) throw Error('Invalid notebook entries.');
    if (!Array.isArray(history) || history.some(entry => !entry || typeof entry.topic !== 'string' ||
        typeof entry.ok !== 'boolean' || !Number.isFinite(Date.parse(entry.date)))) {
      throw Error('Invalid review history.');
    }
    validateMap(scanNotes, scanPrefix, item => typeof item === 'string');
    validateMap(drawings, drawingPrefix, strokes => Array.isArray(strokes) &&
      strokes.every(stroke => Array.isArray(stroke) && stroke.length &&
        stroke.every(point => Array.isArray(point) && point.length === 2 &&
          point.every(coordinate => Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1))));
    validateMap(layers, layerPrefix, entry => entry && Array.isArray(entry.enabled) &&
      entry.enabled.every(id=>typeof id==='string') && Number.isFinite(entry.opacity) &&
      entry.opacity>=0 && entry.opacity<=85 && typeof entry.overlay==='boolean');
    validateMap(bookmarks,bookmarkPrefix,value=>typeof value==='string'&&value.length>0);
    return { notes, history, scanNotes, drawings, layers, bookmarks };
  }

  function merge(local, imported) {
    const conflicts = [];
    const notes = new Map(local.notes.map(note => [note.id, note]));
    for (const note of imported.notes) {
      const existing = notes.get(note.id);
      if (!existing) notes.set(note.id, note);
      else if (existing.body !== note.body || existing.region !== note.region) {
        conflicts.push({ ...note, id: crypto.randomUUID() });
      }
    }
    const matchingNotes = new Set([...notes.values()].map(note => JSON.stringify([note.region, note.created, note.body])));
    for (const note of conflicts) {
      const signature = JSON.stringify([note.region, note.created, note.body]);
      if (!matchingNotes.has(signature)) {
        notes.set(note.id, note);
        matchingNotes.add(signature);
      }
    }
    const attempts = new Map([...local.history, ...imported.history].map(entry =>
      [JSON.stringify([entry.topic, entry.ok, entry.date]), entry]));
    const scanNotes = { ...local.scanNotes };
    for (const [key, body] of Object.entries(imported.scanNotes)) {
      if (!Object.hasOwn(scanNotes, key)) scanNotes[key] = body;
      else if (body && scanNotes[key] !== body) {
        const restored = '\n\n[Restored from backup]\n' + body;
        if (!scanNotes[key].includes(restored)) scanNotes[key] += restored;
      }
    }
    const drawings = { ...local.drawings };
    for (const [key, strokes] of Object.entries(imported.drawings)) {
      drawings[key] = [...new Map([...(drawings[key] ?? []), ...strokes].map(stroke =>
        [JSON.stringify(stroke), stroke])).values()];
    }
    return {
      notes: [...notes.values()].sort((a, b) => String(b.created ?? '').localeCompare(String(a.created ?? ''))),
      history: [...attempts.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
      scanNotes,
      drawings,
      layers: { ...imported.layers, ...local.layers },
      bookmarks: { ...imported.bookmarks, ...local.bookmarks }
    };
  }

  function restore(storage, data) {
    const result = merge(validate(read(storage)), validate(data));
    const records = {
      [notebook]: JSON.stringify({ version: 1, notes: result.notes }),
      [review]: JSON.stringify(result.history),
      ...result.scanNotes,
      ...result.bookmarks,
      ...Object.fromEntries(Object.entries(result.layers).map(([key, value]) => [key, JSON.stringify(value)])),
      ...Object.fromEntries(Object.entries(result.drawings).map(([key, strokes]) => [key, JSON.stringify(strokes)]))
    };
    const applied = [];
    try {
      for (const [key, value] of Object.entries(records)) {
        const previous = storage.getItem(key);
        if (previous === value) continue;
        storage.setItem(key, value);
        applied.push([key, previous]);
      }
    } catch (error) {
      // Remove newly created keys first, then restore previous values with the space freed.
      for (const [key] of applied) storage.removeItem(key);
      for (const [key, value] of applied) if (value !== null) storage.setItem(key, value);
      throw error;
    }
    return result;
  }

  globalThis.StudyBackup = { read, validate, restore };
})();
