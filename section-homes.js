(() => {
  const get=id=>document.getElementById(id);
  const node=(tag,text)=>{const item=document.createElement(tag);if(text)item.textContent=text;return item;};
  function link(label,href){const item=node('a',label);item.href=href;return item;}
  function tile(label,href,description){
    const item=link('',href);item.className='dashboard-tile';item.append(node('strong',label),node('small',description));
    return item;
  }
  const tools={
    clinicalTools:[
      ['Scanner Simulator','./?section=clinical&tool=scanner','Rehearse a guided scan prescription with scanner terminology.'],
      ['Slice Planner','./?section=clinical&tool=planner','Plan on linked localizers and adjust slice geometry.'],
      ['Protocol Library','./?section=clinical&tool=protocol','Review protocol examples and practice a prescription.'],
      ['Patient Positioning','./practice.html?focus=positioning','Work through positioning and coil-selection decisions.'],
      ['MRI Safety','./practice.html?focus=clinical-safety','Work through screening and safety scenarios.'],
      ['Clinical Challenges','./study-center.html?section=rotation','Follow a virtual examination from preparation through review.']
    ],
    physicsTools:[
      ['Physics Lessons','./academy.html','Read, visualize, and practice MRI physics.'],
      ['Parameter Lab','./parameter-lab.html','Predict changes, complete a chart, and adjust a protocol.'],
      ['Artifact Academy','./study-center.html?section=artifact','Recognize artifacts and compare correction strategies.'],
      ['Pulse Sequences','./real-scans.html','Compare real MRI examples and sequence contrast.'],
      ['Physics Sandbox','./?section=physics&tool=sandbox','Explore relaxation, signal, and Larmor frequency.'],
      ['Physics Reference','./?section=physics&tool=physics','Review parameter relationships and the sequence chart.']
    ],
    practiceTools:[
      ['Endless Practice','./practice.html','Continue your adaptive practice session.'],
      ['ARRT / ARMRIT Mock Exams','./registry.html','Open timed exams, tutor practice, and saved results.'],
      ['Real MRI Anatomy Quizzes','./?section=study-center&quiz=anatomy#subjectQuizzes','Choose a verified MRI dataset for identification practice.'],
      ['Trouble Questions','./practice.html?view=trouble','Review misses and revisit guided explanations.'],
      ['Flashcards','./?section=practice','Review cards and take a pre-study quiz.'],
      ['Subject Quizzes','#subjectQuizzes','Choose from the available question bank.']
    ]
  };
  const regionalGroups=[
    ['Brain & Head','./atlas/cerebra-preview.webp','Brain MRI available',['brain','face','neck','iac','inner-ear','orbits','sinus','mrv']],
    ['Spine','./atlas/plates/cervical.webp','Cervical and upper thoracic MRI available',['cervical','thoracic','lumbar','sacrum']],
    ['Upper Extremities','./atlas/plates/hand-bones.webp','Illustrations and references',['shoulder','arm','elbow','forearm','wrist','hand']],
    ['Lower Extremities','./atlas/plates/knee.webp','Knee MRI available',['hip','thigh','knee','leg','ankle','foot']],
    ['Abdomen & Pelvis','./atlas/plates/liver.webp','Illustrations and references',['abdomen','pelvis']],
    ['Chest & Cardiac','./atlas/plates/heart.webp','Partial cardiac MRI available',['chest','heart']]
  ];
  const rows=new Map(BodyIndex.groups.flatMap(([,entries])=>entries.map(row=>[row[0],row])));
  function renderAnatomy(){
    const grid=get('bodyRegionGrid');
    if(grid.children.length)return;
    const label=node('label','Filter by organ system ');
    label.className='dashboard-filter';const select=node('select');
    select.append(new Option('All body regions',''),...OrganCatalog.map((group,index)=>new Option(group.system,index)));
    label.append(select);grid.before(label);
    const results=node('div');results.className='dashboard-grid';grid.after(results);results.hidden=true;
    function filter(){
      const value=select.value;
      grid.hidden=Boolean(value);results.hidden=!value;
      results.replaceChildren();
      if(value==='')return;
      for(const entry of OrganCatalog[Number(value)].entries){
        const route=entry.mri?'./brain-atlas.html?'+new URLSearchParams({region:entry.mri,structure:entry.target}):
          './study-center.html?section=systems&structure='+entry.id;
        results.append(tile(entry.name,route,entry.mri?'Open labeled MRI':'View illustrated anatomy'));
      }
    }
    select.onchange=()=>{
      const params=new URLSearchParams();
      if(select.value)params.set('system',select.value);
      AppNavigation.navigate(params.size?'?'+params:location.pathname);filter();
    };
    const route=()=>{
      const requested=new URLSearchParams(location.search).get('system');
      select.value=/^\d+$/.test(requested??'')&&OrganCatalog[requested]?requested:'';filter();
    };
    window.addEventListener('popstate',route);
    window.addEventListener('pageshow',route);
    for(const [title,asset,coverage,ids] of regionalGroups){
      const card=node('details');card.className='dashboard-tile';
      const stateKey='mri.navigation.region.'+ids[0];
      try{card.open=sessionStorage.getItem(stateKey)==='open';}catch{}
      card.addEventListener('toggle',()=>{
        try{sessionStorage.setItem(stateKey,card.open?'open':'closed');}catch{}
      });
      const summary=node('summary'),img=node('img'),caption=node('span');
      img.src=asset;img.alt='';img.loading='lazy';caption.append(node('strong',title),node('small',coverage));summary.append(img,caption);
      const list=node('ul');list.className='region-list';
      for(const id of ids){
        const [,name,,pack,plate]=rows.get(id);
        const href=pack?'./brain-atlas.html?region='+pack:'./study-center.html?section=body&part='+id;
        const entry=node('li');
        entry.append(link(name,href),node('small',pack?'Real MRI'+(id==='thoracic'?' · upper coverage':id==='heart'?' · left atrial crop':''):plate?'Illustrated reference · Real MRI not yet available':'Text reference · Real MRI not yet available'));
        if(pack)entry.append(link(name+' regional reference','./study-center.html?section=body&part='+id));
        list.append(entry);
      }
      if(ids.includes('brain')){
        const entry=node('li');
        entry.append(link('Intracranial MRA','./real-scans.html?scan=mra'),
          node('small','Real MR angiography demonstration. No verified vessel labels.'));list.append(entry);
        const missing=node('li');
        missing.append(node('small','Dedicated sellar MRI is unavailable.'),
          link('Pituitary anatomy illustration','./study-center.html?section=systems&structure=4'));
        list.append(missing);
      }
      card.append(summary,list);grid.append(card);
    }
    route();
  }
  function resume(host,value,title,label){
    host.hidden=!value;host.replaceChildren();
    if(value)host.append(node('h2',title),node('p',[value.topic,value.position].filter(Boolean).join(' · ')),link(label,value.href));
  }
  function readActivity(){
    try{return JSON.parse(localStorage.getItem('mri-study-lab-review-v1')??'[]');}
    catch{return [];}
  }
  const subjectCards=[
    ['MRI Physics','subject=Physics'],['Pulse Sequences','focus=sequence'],
    ['Imaging Parameters','focus=parameter-registry'],['Image Production','subject=Image+Production'],
    ['Artifacts','subject=Artifacts'],['MRI Safety','subject=Safety'],['Patient Care','subject=Patient+Care'],
    ['Procedures','subject=Procedures'],['Anatomy','subject=Anatomy'],['Pathology','focus=pathology'],
    ['Lower Extremity','region=all'],['Hand and Wrist','focus=hand'],['Long Bones','focus=bone']
  ];
  let bank;
  async function studySummary(){
    StudyResume.card(get('resumeStudy'));
    const summary=get('learningSummary');
    summary.replaceChildren(node('h2','Daily review'));
    try{
      const {attempts,records}=await StudyStore.snapshot();
      const atlas=readActivity().filter(row=>/^(cerebra|knee|cardiac|spine|plate)/.test(row.topic??''));
      const reviewed=StudyReview.summarize(attempts,records.find(row=>row.id==='reset')?.value.at);
      const due=[...reviewed.values()].filter(row=>row.due>0&&row.due<=Date.now()).length;
      const independent=attempts.filter(a=>!a.hint),assisted=attempts.filter(a=>a.hint);
      const rate=(correct,total)=>total?Math.round(100*correct/total)+'% ('+correct+'/'+total+')':'No answers yet';
      const atlasIndependent=atlas.filter(a=>!a.assisted),atlasAssisted=atlas.filter(a=>a.assisted);
      const counts=independent.length+atlasIndependent.length;
      const assistedCount=assisted.length+atlasAssisted.length;
      summary.append(node('p','Independent accuracy '+rate(independent.filter(a=>a.correct).length+
        atlasIndependent.filter(a=>a.ok).length,counts)),node('p','Assisted accuracy '+rate(assisted.filter(a=>a.correct).length+
        atlasAssisted.filter(a=>a.correct).length,assistedCount)),node('p',due+' questions due for review'));
      const stats=StudyReview.dashboard(attempts);
      const weakest=[...stats.topics].sort(([,a],[,b])=>a.correct/a.n-b.correct/b.n)[0]?.[0];
      if(weakest)summary.append(node('p','Start with '+weakest+' or review due questions.'));
      summary.append(link(due?'Review due questions':'Start weak-area practice','./practice.html?'+(due?'view=trouble&due=1':'weak=1')));
    }catch{summary.append(node('p','Study history is unavailable on this device.'));}
  }
  async function showSubjects(){
    const root=get('subjectLinks');
    if(new URLSearchParams(location.search).get('quiz')==='anatomy'){
      root.replaceChildren(...[['Brain','brain'],['Cervical spine','spine'],['Knee','knee'],['Heart','cardiac']].map(([label,region])=>
        tile(label+' MRI','./brain-atlas.html?practice=1&from=study&region='+region,'Open the shared Anatomy Explorer quiz controls')));
      return;
    }
    if(!root.children.length)root.append(node('p','Checking question availability…'));
    bank??=RegistryImageView.available(RegistryContent.bank.filter(question=>!question.pilot));
    const available=await bank;
    if(new URLSearchParams(location.search).get('quiz')==='anatomy')return;
    root.replaceChildren(...subjectCards.map(([label,query])=>{
      const params=new URLSearchParams(query);
      const n=available.filter(q=>params.has('subject')?StudyReview.subject(q)===params.get('subject'):
        params.has('region')?LowerExtremity.matches(q,params.get('region')):StudyFocus.matches(q,params.get('focus'))).length;
      return tile(label,'./practice.html?'+query,n?n+' available questions':'No dedicated questions available');
    }),tile('Physics challenges','./?section=practice&tool=physics','Original interactive parameter practice'));
  }
  async function physicsProgress(){
    const host=get('physicsProgress');
    resume(host,StudyResume.read('Physics Academy'),'Continue Learning','Resume lesson');
    host.hidden=false;
    if(!host.children.length)host.append(node('h2','Lesson progress'));
    try{
      const {records}=await StudyStore.snapshot();
      const chapters=new Set(PhysicsLessons.lessons.map(lesson=>'lesson:'+lesson.id));
      const done=records.filter(row=>chapters.has(row.id)&&row.value.complete).length;
      host.append(node('p',done+' of '+chapters.size+' lessons completed.'));
    }catch{host.append(node('p','Lesson progress is unavailable on this device.'));}
  }
  function refresh(page){
    for(const [id,cards] of Object.entries(tools)){
      const grid=get(id);
      if(!grid.children.length)grid.append(...cards.map(card=>tile(...card)));
    }
    renderAnatomy();
    if(page==='practiceHome'){studySummary();showSubjects();}
    if(page==='physicsHome')physicsProgress();
    if(page==='clinicalHome'){
      const prior=StudyResume.read();
      const legacy=/^(Patient Positioning|MRI Safety|Virtual Clinical Rotation)$/.test(prior?.mode??'')?prior:null;
      resume(get('resumeClinical'),StudyResume.read('Clinical')??legacy,'Resume Clinical Training','Resume saved training');
    }
  }
  globalThis.SectionHomes={refresh};
})();
