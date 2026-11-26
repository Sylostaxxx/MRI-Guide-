(() => {
  const lessons = {
    'foundations':['p01','p02','v01','v02','v03'],
    'hydrogen':['v04','v05','v06','v07','v08'],
    'magnetism':['v09','v10','v11','v12','v13'],
    'alignment':['v14','v15','v16','v17','v18'],
    'larmor':['p31','p32','p36','v19','v20'],
    'rf':['v21','v22','v23','v24','v25'],
    'flip-angle':['v26','v27','v28','v29','v30'],
    't1':['p33','v31','v32','v33','v34'],
    't2':['p34','v35','v36','v37','v38'],
    't2-star':['p40','v39','v40','v41','v42'],
    'k-space':['v43','v44','v45','v46','v47']
  };
  const linked = Object.fromEntries(Object.entries(lessons).flatMap(([lesson,ids])=>ids.map(id=>[id,lesson])));
  function lessonFor(question) {
    if (question.parameterLesson) return question.parameterLesson;
    if (Object.hasOwn(linked,question.id)) return linked[question.id];
    const topic = question.topic.toLowerCase();
    if (/k.space|zero.fill|partial fourier/.test(topic)) return 'k-space';
    if (/larmor|gyromagnetic|resonance frequency/.test(topic)) return 'larmor';
    if (/t2.star|dephasing|susceptibility/.test(topic)) return 't2-star';
    if (/t1 |longitudinal recovery/.test(topic)) return 't1';
    if (/t2 |transverse decay/.test(topic)) return 't2';
    if (/flip angle/.test(topic)) return 'flip-angle';
    if (/rf excitation/.test(topic)) return 'rf';
    return null;
  }
  function difficulty(question) {
    if (question.difficulty) return question.difficulty;
    if (question.type !== 'single' || question.formula || /parallel|perfusion|phase.contrast|spectroscopy/i.test(question.topic)) return 'Advanced';
    return 'Registry';
  }
  function related(question) {
    if (question.id.startsWith('art-')||question.parameterLesson) return question.related;
    const lesson = lessonFor(question);
    return lesson ? './academy.html?lesson='+lesson : question.related;
  }
  globalThis.StudyContentMap = {lessons,lessonFor,difficulty,related};
})();
