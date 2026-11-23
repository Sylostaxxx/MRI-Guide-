// Normalized points reviewed on the exact unlabeled assets in quiz-assets.js.
export const illustrationTargets = {
  brain: [
    ['Cerebellum',.741,.606],['Pituitary gland',.416,.597],
    ['Thalamus',.524,.402],['Spinal cord',.619,.854]
  ],
  heart: [
    ['Left atrium',.62,.447,'cardiac1:1'],['Right atrium',.268,.573],
    ['Left ventricle',.742,.723],['Right ventricle',.435,.752]
  ],
  knee: [
    ['Femur',.582,.274,'knee1:1'],['Patella',.105,.496],['Tibia',.608,.817],['Femoral cartilage',.561,.635,'knee1:2']
  ]
};
const landmarks = {
  'Cerebellum':'Look behind the brainstem in the posterior fossa, beneath the occipital lobes.',
  'Pituitary gland':'Find the small structure in the sella below the optic chiasm and connected by a stalk.',
  'Thalamus':'Look in the deep central forebrain, beside the third ventricle and above the midbrain.',
  'Spinal cord':'Follow the lower brainstem through the foramen magnum into the vertebral canal.',
  'Left atrium':'Trace the chamber that receives the pulmonary veins and lies upstream of the mitral valve.',
  'Right atrium':'Trace the chamber receiving systemic venous return and lying upstream of the tricuspid valve.',
  'Left ventricle':'Find the thick-walled chamber continuous with the aortic outflow.',
  'Right ventricle':'Follow the chamber downstream of the tricuspid valve toward pulmonary outflow.',
  'Femur':'Find the bone above the tibiofemoral joint line.',
  'Patella':'Look in front of the joint in the extensor mechanism.',
  'Tibia':'Find the main load-bearing bone below the joint line.',
  'Femoral cartilage':'Look along the thin articular surface covering the distal thigh bone.'
};
export const verifiedVariant = Object.freeze({brainstem:'brain','brain-cross':'brain',diencephalon:'brain',heart:'heart','heart-cross':'heart',knee:'knee','knee-cross':'knee'});

function shuffle(values) {
  const items=[...values];
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}

export function platePractice(el, ui, display, layout, done) {
  let source, deck=[], index=0, assisted=false, hinted=false,hintLevel=0,hintsHidden=false, locked=false, total=0, scores;
  const stage=el('platePoints');
  const key='mri.atlas.illustration.session.v1';
  let restored=false, result=null, lastPick=null;
  function save(){
    if(!deck.length)return;
    try{
      localStorage.setItem(key,JSON.stringify({version:1,source,
        deck:deck.map(([region,[name]])=>[region,name]),index,locked,hintLevel,hintsHidden,scores,result,lastPick}));
    }catch{}
    const url=new URL(location.href);
    url.searchParams.set('resumePlate','1');
    StudyResume.save('Anatomy Explorer','Illustrated identification',deck[index]?.[1][0],'Question '+(index+1)+' of '+total,url.href);
  }
  function openCorrection(name,region,picked) {
    const url=new URL(location.href);url.searchParams.set('plateCorrection','1');
    AppNavigation.navigate(url,false,{mriPlateCorrection:true});
    correction(name,region,picked);
  }
  function correction(name,region,picked) {
    const host=el('atlasCorrection');
    host.hidden=!new URLSearchParams(location.search).has('plateCorrection');
    if(host.hidden)return;
    StudyGuidance.correction(host,{id:'plate-'+region,topic:name,stem:'Locate '+name+'.',type:'single',key:[0],
      options:[[name,landmarks[name]],[picked,'This hotspot identifies '+picked+'. Compare its relationship to the landmarks of the verified target.']],
      related:region==='brain'?'./brain-atlas.html':region==='heart'?'./brain-atlas.html?region=cardiac':'./brain-atlas.html?region=knee'
    },[1],{back:()=>{
      if(history.state?.mriPlateCorrection)history.back();
      else {clearCorrection();host.hidden=true;save();}
    }});
    save();
  }
  function clearCorrection(){
    const url=new URL(location.href);
    if(!url.searchParams.has('plateCorrection'))return;
    url.searchParams.delete('plateCorrection');
    AppNavigation.navigate(url,true,{mriPlateCorrection:false});
  }
  window.addEventListener('popstate',()=>{
    if(deck.length&&result?.tone==='incorrect')correction(deck[index][1][0],deck[index][0],lastPick);
  });
  window.addEventListener('pagehide',save);
  function finish() {
    deck=[];stage.replaceChildren();ui.close();layout(false);display(source);
    clearCorrection();
    const route=new URL(location.href);route.searchParams.delete('resumePlate');
    AppNavigation.navigate(route,true);
    try{localStorage.removeItem(key);}catch{}
    StudyResume.clear('Anatomy Explorer','Illustrated identification');
  }
  function next() {
    clearCorrection();
    if (++index<total) { show();return; }
    done('Quiz complete · '+scores.correct+' correct without a hint · '+scores.assisted+' assisted.');
    finish();
  }
  function show(saved) {
    const [key,expected]=deck[index], [name]=expected;
    hintLevel=saved?.hintLevel??0;hintsHidden=Boolean(saved?.hintsHidden);
    assisted=hintLevel>0;hinted=hintLevel===3&&!hintsHidden;locked=Boolean(saved?.locked);
    result=saved?.result??null;lastPick=saved?.lastPick??null;
    display(key,true);
    stage.replaceChildren();
    let correctPoint;
    function answer(choice) {
      if(locked)return;
      const correct=choice===expected;lastPick=choice[0];
      try {
        const storageKey='mri-study-lab-review-v1';
        const history=JSON.parse(localStorage.getItem(storageKey)??'[]');
        history.unshift({topic:'illustrated:'+key+':'+name,structureId:expected[3],ok:correct&&!assisted,assisted,hintLevel,correct,date:new Date().toISOString()});
        localStorage.setItem(storageKey,JSON.stringify(history));
      } catch {}
      if(!correct&&el('retry').checked){ui.feedback('Incorrect. Try another location.','incorrect');save();return;}
      locked=true;
      scores.correct+=Number(correct&&!assisted);scores.assisted+=Number(assisted);
      for(const point of stage.children)point.disabled=true;
      correctPoint.classList.remove('hinted');
      correctPoint.classList.add('answered');
      result={message:correct?(assisted?'Correct with a hint (Hint '+hintLevel+').':'Correct. Independent recall.'):'Incorrect. The correct location is marked.',
        tone:correct?'correct':'incorrect'};
      ui.result(result.message,result.tone);save();
    }
    for(const [position,choice] of illustrationTargets[key].entries()) {
      const [,x,y]=choice, point=document.createElement('button');
      point.className='plate-point';point.type='button';
      point.style.left=x*100+'%';point.style.top=y*100+'%';
      point.textContent=position+1;
      point.setAttribute('aria-label','Location '+(position+1));
      point.onclick=()=>answer(choice);
      point.ondragover=event=>event.preventDefault();
      point.ondrop=event=>{event.preventDefault();if(event.dataTransfer.getData('text/plain')===name)answer(choice);};
      if(choice===expected)correctPoint=point;
      stage.append(point);
    }
    const cues={
      brain:['Use the sagittal midline to distinguish the forebrain from the posterior fossa.','Use the ventricular spaces and brainstem as references for the neighboring structures.'],
      heart:['Orient the upper chambers and the ventricles first.','Trace the chambers relative to the atrioventricular valves and ventricular septum.'],
      knee:['Locate the thigh, lower leg and front of the knee.','Use the joint line to separate the ends of the bones and the surfaces lining the joint.']
    }[key];
    const hints=[cues[0],landmarks[name]??cues[1],'The verified illustration hotspot is highlighted.'];
    function toggle(hide){
      if(hide)hintsHidden=!hintsHidden;
      else {hintLevel=Math.min(3,hintLevel+1);hintsHidden=false;}
      assisted=hintLevel>0;hinted=hintLevel===3&&!hintsHidden;
      correctPoint.classList.toggle('hinted',hinted);ui.hints(hints,hintLevel,hintsHidden);save();
    }
    ui.show({name,number:index+1,total,drag:true,next,exit:finish,hint:()=>toggle(false),hideHint:()=>toggle(true),
      teach:()=>openCorrection(name,key,lastPick)});
    if(locked&&result){
      for(const point of stage.children)point.disabled=true;
      correctPoint.classList.add('answered');
      ui.result(result.message,result.tone);
      if(result.tone==='incorrect')correction(name,key,lastPick);
    }else if(hintLevel){correctPoint.classList.toggle('hinted',hinted);ui.hints(hints,hintLevel,hintsHidden);}
    save();
  }
  function start(items) {
    if(!items.length||items.some(([key])=>!Object.hasOwn(QuizAssets,key)))return;
    deck=items;index=0;total=items.length;scores={correct:0,assisted:0};
    const route=new URL(location.href);route.searchParams.set('resumePlate','1');
    AppNavigation.navigate(route,true);
    layout(true);show();
  }
  el('platePractice').onclick=()=>{
    const key=verifiedVariant[source];
    if(key)start(shuffle(illustrationTargets[key]).slice(0,3).map(item=>[key,item]));
  };
  el('plateMixed').onclick=()=>start(shuffle(Object.entries(illustrationTargets).flatMap(([key,items])=>
    shuffle(items).slice(0,2).map(item=>[key,item]))));
  return next=>{
    source=next;
    if(deck.length){layout(true);return true;}
    if(next&&!restored&&['resumePlate','plateCorrection'].some(flag=>new URLSearchParams(location.search).has(flag))){
      restored=true;
      try{
        const value=JSON.parse(localStorage.getItem(key));
        if(value?.version===1&&Array.isArray(value.deck)){
          const matches=value.deck.map(([region,name])=>[region,illustrationTargets[region]?.find(item=>item[0]===name)]);
          if(matches[value.index]&&matches.every(([region,item])=>item&&Object.hasOwn(QuizAssets,region))){
            deck=matches;index=value.index;total=matches.length;scores=value.scores;
            layout(true);show(value);return true;
          }
        }
      }catch{}
    }
    el('platePractice').hidden=!verifiedVariant[source];
    el('plateUnavailable').hidden=!source||!!verifiedVariant[source];
    el('plateMixed').hidden=!source;
  };
}
