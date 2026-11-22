// Coordinates refer to the named structures on the exact bundled textbook plate.
const landmarks = {
  'brain-cross': {
    Caudate:[.445,.648],Putamen:[.367,.655],Pallidum:[.411,.697],'Lateral ventricle':[.482,.618]
  },
  heart: {
    'Left atrium':[.581,.317],'Right atrium':[.359,.415],
    'Left ventricle':[.613,.615],'Right ventricle':[.378,.559]
  },
  'knee-cross': {
    Femur:[.207,.243],Patella:[.279,.325],Tibia:[.204,.638],'Medial meniscus':[.704,.514]
  }
};

function shuffle(values) {
  const items=[...values];
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}

export function platePractice(el, display) {
  let plate, source, task, assisted, exam;
  const stage=el('platePoints'), feedback=el('plateFeedback'), token=el('plateToken');
  function clear() {
    task=null;assisted=false;stage.replaceChildren();
    token.hidden=true;el('plateHint').hidden=true;el('plateFinish').hidden=true;
    el('plateNext').hidden=true;
  }
  function finish() {
    clear();
    exam=null;display(source);plate=source;
    feedback.textContent='';
  }
  function answer(name) {
    if(!task)return;
    const expected=task, correct=expected===name;
    try {
      const key='mri-study-lab-review-v1';
      const history=JSON.parse(localStorage.getItem(key)??'[]');
      history.unshift({topic:'illustrated:'+plate+':'+expected,ok:correct&&!assisted,assisted,correct,date:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(history));
    } catch {}
    if(exam){
      if(assisted)exam.assisted++;
      if(correct&&!assisted)exam.independent++;
      clear();
      el('plateNext').hidden=false;el('plateFinish').hidden=false;
      feedback.textContent=correct?'Correct · '+expected+'.':'Correct location · '+expected+'.';
    }else if(correct){
      feedback.textContent='Correct · '+name+(assisted?' with a hint.':'.');clear();
    }else feedback.textContent='Try again. Locate '+task+'.';
  }
  function start(target) {
    clear();
    const items=Object.entries(landmarks[plate]);
    task=target??shuffle(items)[0][0];
    token.hidden=false;token.textContent=task;token.draggable=true;
    el('plateHint').hidden=false;el('plateFinish').hidden=false;
    const prefix=exam?'Question '+(exam.index+1)+' of '+exam.deck.length+'. ':'';
    feedback.textContent=prefix+'Tap the point on the plate, or drag the label to it.';
    for(const [index,[name,[x,y]]] of items.entries()) {
      const point=document.createElement('button');
      point.className='plate-point';point.type='button';
      point.style.left=x*100+'%';point.style.top=y*100+'%';
      point.textContent=index+1;
      point.setAttribute('aria-label','Location '+(index+1));
      point.onclick=()=>answer(name);
      point.ondragover=event=>event.preventDefault();
      point.ondrop=event=>{
        event.preventDefault();
        if(event.dataTransfer.getData('text/plain')===task)answer(name);
      };
      point.dataset.target=name;
      stage.append(point);
    }
  }
  function showExamQuestion() {
    const [key,name]=exam.deck[exam.index];
    plate=key;display(plate);start(name);
  }
  token.ondragstart=event=>event.dataTransfer.setData('text/plain',task);
  el('platePractice').onclick=()=>{finish();start();};
  el('plateMixed').onclick=()=>{
    finish();
    exam={index:0,independent:0,assisted:0,
      deck:shuffle(Object.entries(landmarks).flatMap(([key,points])=>
        shuffle(Object.keys(points)).slice(0,2).map(name=>[key,name])))};
    showExamQuestion();
  };
  el('plateNext').onclick=()=>{
    if(++exam.index<exam.deck.length){showExamQuestion();return;}
    const {deck,independent,assisted:guided}=exam;
    finish();
    feedback.textContent='Exam complete · '+independent+' of '+deck.length+' correct without a hint · '+guided+' assisted.';
  };
  el('plateHint').onclick=()=>{
    if(!task)return;
    assisted=true;
    for(const point of stage.children)point.classList.toggle('hinted',point.dataset.target===task);
    feedback.textContent='The correct textbook landmark is marked in yellow. Choose it to answer.';
  };
  el('plateFinish').onclick=finish;
  return next=>{
    if(source===next)return;
    clear();source=next;plate=next;exam=null;feedback.textContent='';
    el('platePractice').hidden=!landmarks[plate];
  };
}
