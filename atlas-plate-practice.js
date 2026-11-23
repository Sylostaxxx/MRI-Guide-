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
  function finish() {
    deck=[];stage.replaceChildren();ui.close();layout(false);display(source);
  }
  function next() {
    if (++index<total) { show();return; }
    done('Quiz complete · '+scores.correct+' correct without a hint · '+scores.assisted+' assisted.');
    finish();
  }
  function show() {
    const [key,expected]=deck[index], [name]=expected;
    assisted=false;hinted=false;hintLevel=0;hintsHidden=false;locked=false;
    display(key,true);
    stage.replaceChildren();
    let correctPoint;
    function answer(choice) {
      if(locked)return;
      const correct=choice===expected;
      try {
        const storageKey='mri-study-lab-review-v1';
        const history=JSON.parse(localStorage.getItem(storageKey)??'[]');
        history.unshift({topic:'illustrated:'+key+':'+name,structureId:expected[3],ok:correct&&!assisted,assisted,hintLevel,correct,date:new Date().toISOString()});
        localStorage.setItem(storageKey,JSON.stringify(history));
      } catch {}
      if(!correct&&el('retry').checked){ui.feedback('Incorrect. Try another location.','incorrect');return;}
      locked=true;
      scores.correct+=Number(correct&&!assisted);scores.assisted+=Number(assisted);
      for(const point of stage.children)point.disabled=true;
      correctPoint.classList.remove('hinted');
      correctPoint.classList.add('answered');
      ui.result(correct?(assisted?'Correct with a hint.':'Correct. Independent recall.'):'Incorrect. The correct location is marked.',correct?'correct':'incorrect');
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
    const hints=[...cues,'The verified illustration hotspot is highlighted.'];
    function toggle(hide){
      if(hide)hintsHidden=!hintsHidden;
      else {hintLevel=Math.min(3,hintLevel+1);hintsHidden=false;}
      assisted=hintLevel>0;hinted=hintLevel===3&&!hintsHidden;
      correctPoint.classList.toggle('hinted',hinted);ui.hints(hints,hintLevel,hintsHidden);
    }
    ui.show({name,number:index+1,total,drag:true,next,exit:finish,hint:()=>toggle(false),hideHint:()=>toggle(true)});
  }
  function start(items) {
    if(!items.length||items.some(([key])=>!Object.hasOwn(QuizAssets,key)))return;
    deck=items;index=0;total=items.length;scores={correct:0,assisted:0};
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
    el('platePractice').hidden=!verifiedVariant[source];
    el('plateUnavailable').hidden=!source||!!verifiedVariant[source];
    el('plateMixed').hidden=!source;
  };
}
