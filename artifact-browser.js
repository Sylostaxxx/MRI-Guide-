(() => {
  const el = id => document.getElementById(id);
  const select = el('artifactLesson');
  const {lessons} = ArtifactAcademy;
  const terms = [
    ['Definition','definition'], ['In plain language','simple'], ['Physical mechanism','mechanism'],
    ['Recognize it on MRI','appearance'], ['Troubleshooting and tradeoffs','correction'], ['Interpretation pitfall','pitfall']
  ];
  const make = (tag,text) => {
    const item = document.createElement(tag);
    item.textContent = text;
    return item;
  };
  for (const name of new Set(lessons.map(lesson=>lesson.group))) {
    const group = document.createElement('optgroup');
    group.label = name;
    group.append(...lessons.filter(lesson=>lesson.group===name).map(lesson=>new Option(lesson.name,lesson.id)));
    select.append(group);
  }
  function render() {
    const lesson = lessons.find(item=>item.id===select.value);
    el('artifactLessonTitle').textContent = lesson.name;
    el('artifactLessonContent').replaceChildren(...terms.flatMap(([name,key])=>[make('dt',name),make('dd',lesson[key])]));
    el('artifactSource').textContent = lesson.source[0];
    el('artifactSource').href = lesson.source[1];
    el('artifactPhysics').href = './academy.html?lesson='+lesson.physics;
    el('artifactCase').href = './practice.html?retry=art-'+lesson.id;
    const demo = ['ghost','wrap','shift'].includes(lesson.id);
    el('artifactDemo').hidden = !demo;
    if (demo) {
      el('artifactType').value = lesson.id;
      el('artifactType').dispatchEvent(new Event('input'));
    }
  }
  function route() {
    const lesson = new URLSearchParams(location.search).get('lesson');
    select.value = lessons.some(item=>item.id===lesson) ? lesson : 'ghost';
    render();
  }
  select.onchange = () => {
    AppNavigation.navigate('?section=artifact&lesson='+select.value);
    render();
  };
  el('artifactType').addEventListener('input',()=>{
    if (select.value===el('artifactType').value) return;
    select.value = el('artifactType').value;
    select.onchange();
  });
  globalThis.ArtifactBrowser = {route};
})();
