(() => {
  const day = 86400000;
  const severeThreshold = 3;
  const weekdays = timestamp => {
    const date = new Date(timestamp);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / day;
  };
  function summarize(attempts, reset = 0) {
    const stats = new Map();
    for (const attempt of [...attempts].sort((a,b) => a.at - b.at)) {
      let row = stats.get(attempt.question);
      if (!row) {
        row = {misses:0,lastMiss:0,last:0,due:0,streak:0,independentDays:[],mastered:false};
        stats.set(attempt.question,row);
      }
      row.last = attempt.at;
      if (!attempt.correct) {
        row.misses++;
        row.lastMiss = attempt.at;
      }
      if (attempt.at <= reset) continue;
      if (!attempt.correct || attempt.hint) {
        row.streak = 0;
        row.independentDays = [];
        row.due = attempt.at + (attempt.correct ? day : 4 * 3600000);
      } else {
        const date = weekdays(attempt.at);
        if (!row.independentDays.includes(date)) {
          row.independentDays.push(date);
          row.streak++;
          row.due = attempt.at + [1,3,7,14,30][Math.min(row.streak-1,4)] * day;
        }
      }
      row.mastered = row.independentDays.length >= 3;
    }
    return stats;
  }
  function subject(question) {
    if (/artifact|ghost|zipper|gibbs|alias|wrap|chemical.shift|motion|magic angle|dielectric|distortion/i.test(question.topic)) return 'Artifacts';
    if (question.image || /anatomy|vertebral level/i.test(question.topic)) return 'Anatomy';
    return {physical:'Physics',parameters:'Physics',acquisition:'Image Production',safety:'Safety',
      care:'Patient Care',neuro:'Procedures',body:'Procedures',msk:'Procedures'}[question.category];
  }
  function select(pool, attempts, session, stats, now = Date.now(), random = Math.random) {
    const recent = new Map(session.recent.map((id,index) => [id,index]));
    const last = session.recent.at(-1);
    const lastFamily = pool.find(question=>question.id===last)?.family;
    const different = pool.filter(question => question.id !== last);
    const varied = lastFamily ? different.filter(question=>question.family!==lastFamily) : different;
    const eligible = varied.length ? varied : different.length ? different : pool;
    const performance = new Map();
    for (const attempt of attempts) {
      const key = attempt.topic;
      const row = performance.get(key) ?? {n:0, errors:0};
      row.n++;
      row.errors += Number(!attempt.correct || attempt.hint);
      performance.set(key,row);
    }
    return eligible.map(question => {
      const row = stats.get(question.id);
      const tier = !row ? 3 : row.due <= now ? 2 : 1;
      const performanceRow = performance.get(question.topic);
      const weak = performanceRow ? performanceRow.errors / performanceRow.n : 0;
      const fresh = recent.has(question.id) ? 0 : 1;
      const urgency = row ? Math.min(5,row.misses) + Math.min(30,(now-row.last)/day)/10
        + Number(now-row.lastMiss < 3*day) : 0;
      return {question,tier,fresh,priority:session.weak ? weak*8+urgency : weak*2+urgency,
        age:recent.get(question.id) ?? -1,tie:random()};
    }).sort((a,b) => b.fresh-a.fresh || b.tier-a.tier ||
      (a.fresh ? b.priority-a.priority : a.age-b.age) || a.tie-b.tie)[0]?.question ?? null;
  }
  function dashboard(attempts, now = Date.now()) {
    let today = 0;
    const dates = new Set(), topics = new Map(), history = new Map();
    for (const attempt of attempts) {
      const date = weekdays(attempt.at);
      dates.add(date);
      if (date === weekdays(now)) today++;
      for (const [key,map] of [[attempt.subject,topics],[date,history]]) {
        const row = map.get(key) ?? {n:0,correct:0,assisted:0};
        row.n++;
        row.correct += Number(attempt.correct && !attempt.hint);
        row.assisted += Number(attempt.hint);
        map.set(key,row);
      }
    }
    let date = weekdays(now);
    if (!dates.has(date)) date--;
    let streak = 0;
    while (dates.has(date)) {streak++;date--;}
    return {today,total:attempts.length,streak,topics,history};
  }
  globalThis.StudyReview = {day,severeThreshold,summarize,subject,select,dashboard,dateKey:weekdays};
})();
