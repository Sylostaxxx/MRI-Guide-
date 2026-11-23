export function createQuizPanel(el) {
  let actions;
  const panel=el('quizPanel'), target=el('quizTarget'), feedback=el('quizFeedback');
  function setFeedback(message,tone='') {
    feedback.textContent=message;
    feedback.dataset.tone=tone;
  }
  el('quizHint').onclick=()=>actions?.hint();
  el('quizHideHint').onclick=()=>actions?.hideHint?.();
  el('quizTeach').onclick=()=>actions?.teach?.();
  el('quizNext').onclick=()=>actions?.next();
  el('quizExit').onclick=()=>actions?.exit();
  el('quizDetails').onclick=()=>actions?.details?.();
  target.ondragstart=event=>event.dataTransfer.setData('text/plain',target.textContent);
  return {
    show(next) {
      actions=next;
      panel.hidden=false;
      document.body.classList.add('quizzing');
      el('quizCount').textContent='Question '+next.number+' of '+next.total;
      el('quizProgress').max=next.total;
      el('quizProgress').value=next.number-1;
      el('quizInstruction').textContent='Locate the following structure';
      target.textContent=next.name;
      target.draggable=Boolean(next.drag);
      target.focus({preventScroll:true});
      el('quizHint').hidden=false;
      el('quizHint').setAttribute('aria-pressed','false');
      el('quizHint').textContent='Show Hint';
      el('quizHideHint').hidden=true;
      el('quizHints').hidden=true;
      el('quizHints').replaceChildren();
      el('quizNext').hidden=true;
      el('quizTeach').hidden=true;
      el('atlasCorrection').hidden=true;
      el('quizDetails').hidden=true;
      el('quizTime').textContent='';
      setFeedback(next.drag?'Tap a location, or drag the name to it.':'');
    },
    close() {
      actions=null;panel.hidden=true;
      document.body.classList.remove('quizzing');
    },
    result(message,tone) {
      setFeedback(message,tone);
      el('quizTeach').hidden=tone!=='incorrect'||!actions.teach;
      el('quizHint').hidden=true;
      el('quizHideHint').hidden=true;
      el('quizHints').hidden=true;
      el('quizNext').hidden=false;
      el('quizNext').textContent=actions.number===actions.total?'Finish quiz':'Next question';
      el('quizDetails').hidden=!actions.details||tone!=='correct';
      el('quizProgress').value=actions.number;
    },
    feedback:setFeedback,
    hints(tips,level,hidden) {
      const panel=el('quizHints');
      panel.hidden=hidden||!level;
      panel.replaceChildren(...tips.slice(0,level).map((tip,index)=>{
        const p=document.createElement('p');p.textContent='Hint '+(index+1)+' · '+tip;return p;
      }));
      el('quizHint').hidden=level>=tips.length;
      el('quizHint').textContent=level?'Give Me a Stronger Hint':'Show Hint';
      el('quizHideHint').hidden=!level;
      el('quizHideHint').textContent=hidden?'Show Revealed Hints':'Hide Hints';
      setFeedback(hidden?'Hints hidden. This question remains assisted.':'Hint '+level+' shown. This question is now assisted.','hint');
    },
    time(text) { el('quizTime').textContent=text; }
  };
}
