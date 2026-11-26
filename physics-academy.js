(async () => {
  const get = id=>document.getElementById(id);
  const simple = (tag,text) => {
    const item=document.createElement(tag);
    if(text!==undefined)item.textContent=text;
    return item;
  };
  const anchor = (title,href) => {
    const link=simple('a',title);
    link.href=href;
    return link;
  };
  const {lessons,sources}=PhysicsLessons;
  const query=new URLSearchParams(location.search);
  const position=Math.max(0,lessons.findIndex(lesson=>lesson.id===query.get('lesson')));
  const lesson=lessons[position];
  const url=id=>'./academy.html?lesson='+id;
  const key='lesson:'+lesson.id;
  const readingKey='mri.academy.read.v1:'+lesson.id;
  function remember() {
    const height=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    StudyResume.save('Physics Academy','Lesson',lesson.title,Math.min(100,Math.round(100*scrollY/height))+'% through lesson',url(lesson.id)+'&resume=1');
    try{localStorage.setItem(readingKey,String(scrollY));}catch{}
  }
  window.addEventListener('pagehide',remember);
  if(query.has('resume'))requestAnimationFrame(()=>{
    try{scrollTo(0,Number(localStorage.getItem(readingKey))||0);}catch{}
  });
  for (const item of lessons) {
    const link=anchor(item.title,url(item.id));
    if (item===lesson) link.setAttribute('aria-current','page');
    get('chapters').append(link);
  }
  get('chapterNumber').textContent='Academy chapter '+(position+1)+' of '+lessons.length;
  for (const name of ['textbook','equation','simple','example','trap','takeaway']) get(name).textContent=lesson[name];
  get('lessonTitle').textContent=lesson.title;
  document.title=lesson.title+' | MRI Physics Academy';
  for (const objective of lesson.objectives) get('objectives').append(simple('li',objective));
  for (const [term,definition] of Object.entries(lesson.terms)) get('terms').append(simple('dt',term),simple('dd',definition));
  for (const [label,href] of sources) {
    const row=simple('li');row.append(anchor(label,href));get('lessonSources').append(row);
  }
  get('lessonQuiz').href='./practice.html?quiz='+lesson.id;
  get('lessonPractice').href='./practice.html?topic='+lesson.id;
  for (const [id,adjacent] of [['previousLesson',lessons[position-1]],['nextLesson',lessons[position+1]]]) {
    if (adjacent) get(id).href=url(adjacent.id);
    else get(id).hidden=true;
  }
  function glossary() {
    const search=get('glossaryQuery').value.trim().toLowerCase();
    const entries=Object.entries(Object.assign({},...lessons.map(item=>item.terms)))
      .filter(([term,definition])=>(term+' '+definition).toLowerCase().includes(search))
      .sort(([a],[b])=>a.localeCompare(b));
    get('glossary').replaceChildren(...entries.flatMap(([term,definition])=>[simple('dt',term),simple('dd',definition)]));
  }
  get('glossaryQuery').oninput=glossary;glossary();
  const [label,min,max,step,value]=PhysicsDiagrams.solutions[lesson.visual];
  const slider=get('diagramValue');
  Object.assign(slider,{min,max,step,value});
  get('diagramLabel').textContent=label;
  function draw() {
    const description=PhysicsDiagrams.draw(get('plot'),lesson.visual,slider.valueAsNumber);
    get('plot').setAttribute('aria-label',description);
    get('diagramReadout').textContent=description;
  }
  slider.oninput=draw;draw();
  const videos=PhysicsVideos[lesson.id]??[];
  get('videoPanel').hidden=!videos.length;
  for (const video of videos) {
    const item=simple('article');
    item.append(simple('h4',video.title),simple('p',video.creator+' · '+video.difficulty+' · '+video.language),
      simple('p',video.description),anchor(video.provider==='YouTube'?'Open on YouTube':'Watch at Stanford Medicine',video.url),
      simple('p','Link verified '+video.verified+'. Playback requires internet access.'));
    get('videos').append(item);
  }
  let progress={bookmarked:false,complete:false};
  const sync=()=>{
    get('bookmarkLesson').setAttribute('aria-pressed',progress.bookmarked);
    get('bookmarkLesson').textContent=progress.bookmarked?'Bookmarked':'Bookmark lesson';
    get('completeLesson').setAttribute('aria-pressed',progress.complete);
    get('completeLesson').textContent=progress.complete?'Completed':'Mark lesson complete';
  };
  try {progress=(await StudyStore.snapshot()).records.find(row=>row.id===key)?.value??progress;}
  catch {get('lessonStatus').textContent='Lesson progress storage is unavailable.';}
  sync();
  for (const [id,field] of [['bookmarkLesson','bookmarked'],['completeLesson','complete']]) {
    get(id).disabled=false;
    get(id).onclick=async()=>{
      get(id).disabled=true;
      try {
        const value={...progress,[field]:!progress[field]};
        await StudyStore.write({id:key,value,at:Date.now()});
        progress=value;sync();
        get('lessonStatus').textContent='Lesson progress saved.';
      } catch {get('lessonStatus').textContent='Lesson progress could not be saved.';}
      finally {get(id).disabled=false;}
    };
  }
  get('saveLessonNote').onclick=()=>{
    const field=get('lessonNote');
    if(!field.value.trim())return;
    try {
      StudyStore.note('physics:lesson:'+lesson.id,lesson.title+'\n'+field.value.trim());
      field.value='';
      get('lessonNoteStatus').textContent='Saved to Notes and bookmarks in Settings.';
    } catch {get('lessonNoteStatus').textContent='Note could not be saved.';}
  };
  if(!query.has('resume'))StudyResume.save('Physics Academy','Lesson',lesson.title,'Chapter '+(position+1),url(lesson.id)+'&resume=1');
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
