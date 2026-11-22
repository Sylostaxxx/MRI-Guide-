// Coordinates refer to the named structures on the exact bundled textbook plate.
const landmarks = {
  'brain-cross': {
    Caudate:[.445,.648],Putamen:[.367,.655],Pallidum:[.411,.697],'Lateral ventricle':[.482,.618]
  },
  heart: {
    'Left atrium':[.581,.317],'Right atrium':[.359,.415],
    'Left ventricle':[.613,.615],'Right ventricle':[.378,.559]
  }
};

export function platePractice(el) {
  let plate, task, assisted;
  const stage=el('platePoints'), feedback=el('plateFeedback'), token=el('plateToken');
  function clear() {
    task=null;assisted=false;stage.replaceChildren();
    token.hidden=true;el('plateHint').hidden=true;el('plateFinish').hidden=true;
  }
  function answer(name) {
    if(!task)return;
    const correct=task===name;
    try {
      const key='mri-study-lab-review-v1';
      const history=JSON.parse(localStorage.getItem(key)??'[]');
      history.unshift({topic:'illustrated:'+plate+':'+task,ok:correct&&!assisted,assisted,correct,date:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(history));
    } catch {}
    if(correct){feedback.textContent='Correct · '+name+(assisted?' with a hint.':'.');clear();}
    else feedback.textContent='Try again. Locate '+task+'.';
  }
  function start() {
    clear();
    const items=Object.entries(landmarks[plate]);
    task=items[Math.floor(Math.random()*items.length)][0];
    token.hidden=false;token.textContent=task;token.draggable=true;
    el('plateHint').hidden=false;el('plateFinish').hidden=false;
    feedback.textContent='Tap the point on the plate, or drag the label to it.';
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
  token.ondragstart=event=>event.dataTransfer.setData('text/plain',task);
  el('platePractice').onclick=start;
  el('plateHint').onclick=()=>{
    if(!task)return;
    assisted=true;
    for(const point of stage.children)point.classList.toggle('hinted',point.dataset.target===task);
    feedback.textContent='The correct textbook landmark is marked in yellow. Choose it to answer.';
  };
  el('plateFinish').onclick=()=>{clear();feedback.textContent='';};
  return next=>{
    if(plate===next)return;
    clear();plate=next;feedback.textContent='';
    el('platePractice').hidden=!landmarks[plate];
  };
}
