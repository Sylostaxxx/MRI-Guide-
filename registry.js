(async () => {
  const el=id=>document.getElementById(id);
  const {arrt,armrit}=RegistryBlueprints;
  RegistryImageView.layout(el('registryImageScroll'),'questionImage');
  RegistryImageView.enablePinch(el('registryImageScroll'),el('imageZoom'));
  const bank=await RegistryImageView.available(RegistryContent.bank);
  const questions=new Map(bank.map(q=>[q.id,q]));
  const core=RegistryCore;
  let storageError=false, data, active, pending=null, showingReview=false;
  try {data=core.read(localStorage);}
  catch {
    data={active:null,history:[],archive:{}};
    storageError=true;
    notice('Saved registry data could not be read. This session will stay in memory.');
  }
  data.archive??={};
  active=data.active;
  if(active)active.lastFocus=Date.now();

  function notice(text) {
    el('storageMessage').textContent=text;el('storageMessage').hidden=!text;
  }
  function save() {
    if(storageError)return;
    try { data.active=active;core.save(localStorage,data);notice('');
      if(active&&active.mode!=='tutorial'){
        const item=active.items[active.index]?.question;
        StudyResume.save('Registry Preparation',active.mode==='exam'?'Timed examination':'Tutor',active.mode==='exam'?active.title:item?.topic,
          'Question '+(active.index+1)+' of '+active.items.length);
      }else if(!active)StudyResume.clear('Registry Preparation'); }
    catch { notice('Registry changes could not be saved. Keep this page open while studying.'); }
  }
  const link=(text,href)=>{
    const a=document.createElement('a');a.textContent=text;const url=new URL(href,location.href);if(['https:','http:'].includes(url.protocol))a.href=url.href;return a;
  };
  const button=(text,action)=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;
  };
  const node=(tag,text)=>{
    const n=document.createElement(tag);
    if(text!==undefined)n.textContent=text;
    return n;
  };
  const categoryName=key=>arrt.categories[key]?.[0]??key;
  function view(name){
    for(const id of ['setup','session','registryCorrection','reviewPage','result','tutorialDone'])el(id).hidden=id!==name;
    document.body.classList.toggle('exam-active',(name==='session'||name==='reviewPage')&&active?.mode==='exam');
  }
  function lazyForm(id){
    if(id==='half'){
      const full=core.buildForm(bank,arrt,'A');
      if(!full)return null;
      const counts={physical:20,parameters:18,acquisition:15,neuro:13,body:7,msk:8,safety:11,care:8};
      let pilots=15;
      return full.filter(item=>item.scored?counts[questions.get(item.id).category]-->0:pilots-->0);
    }
    return core.buildForm(bank,arrt,id);
  }
  const forms=[...['A','B','C','D','E'].map(id=>[id,'Registry Exam '+id]),['half','Half-length · 115 items'],['random','Randomized full-length']];
  for(const [id,label] of forms){
    const enabled=Boolean(lazyForm(id));
    const option=new Option(label+(enabled?'':' · awaiting items'),id);
    option.disabled=!enabled;el('form').add(option);
  }
  el('startExam').disabled=!el('form').value;
  function formStatus(){
    const [id,label]=forms.find(([key])=>key===el('form').value)??[];
    el('formStatus').textContent=id==='half'
      ? '100 scored and 15 pilot items · 115 minutes. Shares questions with Exam A.'
      : label?'200 scored and 30 simulated pilot items. The pilot identities are hidden until submission.':'A full form is unavailable.';
  }
  el('form').onchange=formStatus;formStatus();
  const blueprintSummary=el('blueprintSummary');
  const counts=node('ul');
  for(const [label,count] of Object.values(arrt.categories))counts.append(node('li',label+' · '+count));
  blueprintSummary.append(counts,link('ARRT MRI content specifications',arrt.sources.outline),
    node('br'),link('ARRT exam preparation',arrt.sources.prep),node('br'),link('ARRT computer-based formats',arrt.sources.formats),
    node('p','The simulator uses the requested 230-minute countdown. Practice scores are raw accuracy. Follow your candidate instructions for actual appointment timing.'));
  el('bankSummary').textContent=bank.length+' original study items · '+bank.filter(q=>q.image).length+' real MRI image questions · offline after installation';
  function profileOptions(){
    const isArmrit=el('profile').value==='armrit';
    el('category').replaceChildren(new Option('All topics',''));
    if(isArmrit){
      for(const subject of armrit.subjects)el('category').add(new Option(subject,subject));
    }else for(const [key,[label]] of Object.entries(arrt.categories))el('category').add(new Option(label,key));
    const info=el('profileInfo');
    info.replaceChildren();
    if(isArmrit)info.append('ARMRIT publishes 225 single-best-answer questions over 210 minutes. Subject practice is available here. ',link('Official ARMRIT overview',armrit.source));
  }
  el('profile').onchange=profileOptions;profileOptions();
  LowerExtremity.fill(el('registryLower'),true);
  const urlRegion=new URLSearchParams(location.search).get('region');
  if(urlRegion==='all'||Object.hasOwn(LowerExtremity.regions,urlRegion)){
    el('registryLower').value=urlRegion;el('kind').value='mixed';
  }
  function shortStatus(){
    const region=el('registryLower').value;
    const count=Math.min(10,bank.filter(q=>!q.pilot&&LowerExtremity.matches(q,region)).length);
    const control=el('startShortLower');control.hidden=!region;control.disabled=count<5;
    control.textContent='Start '+count+'-question timed lower-extremity test';
  }
  el('registryLower').onchange=shortStatus;shortStatus();
  el('startTutor').disabled=false;
  function setup(){
    view('setup');showingReview=false;
    const history=el('history');history.replaceChildren();
    if(!data.history.length){history.textContent='Your completed sessions will appear here.';return;}
    for(const entry of data.history.slice(0,30)){
      const date=new Date(entry.date).toLocaleDateString();
      const row=node('p');
      row.append(button(entry.title+' · '+date+' · '+entry.correct+'/'+entry.eligible,()=>showResult(entry)));
      history.append(row);
    }
  }
  function launch(mode,title,items,blueprint=null,minutes=null){
    active=core.makeRun({mode,title,items,blueprint,minutes});
    if(mode==='tutorial')active.pendingExam=pending;
    showingReview=false;save();render();
  }
  function startTutor(kind=el('kind').value){
    const armritSelected=el('profile').value==='armrit';
    const topic=el('category').value;
    const selected=core.selectTutor(bank.filter(q=>LowerExtremity.matches(q,el('registryLower').value)),data.history,{
      count:kind==='daily'?10:Number(el('count').value),
      category:armritSelected?'':topic,subject:armritSelected?topic:'',
      kind,armrit:armritSelected
    });
    if(!selected.length){notice('No questions match those filters yet. Try another topic or review plan.');return;}
    const titles={daily:'Daily warm-up',image:'Real MRI image practice',calc:'Physics calculations',
      missed:'Missed-item review',due:'Spaced review',weak:'Weak-topic practice',mixed:'Tutor session'};
    launch('tutor',titles[kind],selected.map(question=>({question,scored:true})),
      armritSelected?armrit.id:arrt.id);
  }
  el('startTutor').onclick=()=>startTutor();
  el('startShortLower').onclick=()=>{
    const region=el('registryLower').value;
    const selected=core.selectTutor(bank.filter(q=>LowerExtremity.matches(q,region)),data.history,
      {count:10,armrit:el('profile').value==='armrit'});
    if(selected.length<5){notice('There are too few verified questions for a timed test in this region.');return;}
    const name=LowerExtremity.regions[region]?.label??'All Lower Extremity';
    launch('exam',name+' · timed study test',selected.map(question=>({question,scored:true})),null,selected.length);
  };
  const tutorial=[
    {id:'tutorial-single',type:'single',stem:'Select the abbreviation for magnetic resonance imaging.',
      key:[0],options:[['MRI','MRI is the standard abbreviation.'],['MRN','MRN commonly identifies a medical record number.'],['PACS','PACS is an imaging archive and communication system.'],['RF','RF stands for radiofrequency.']]},
    {id:'tutorial-multiple',type:'multiple',stem:'Select the two choices that are anatomical planes.',key:[0,1],
      options:[['Coronal','Coronal is an anatomical plane.'],['Axial','Axial is an anatomical plane.'],['Echo time','This is a sequence timing parameter.'],['Bandwidth','This is a frequency range.']]},
    {id:'tutorial-order',type:'order',stem:'Use Move up and Move down to arrange these intervals from shortest to longest.',key:[0,1,2,3],
      options:[['10 ms','This is the shortest.'],['100 ms','This follows 10 ms.'],['1 s','One second equals one thousand milliseconds.'],['1 min','One minute is the longest.']]}
  ];
  function actualExam(){
    if(!pending)return;
    const {id}=pending;
    const items=lazyForm(id);
    if(!items){setup();notice('That form is unavailable in this bank version.');return;}
    const [,name]=forms.find(([key])=>key===id);
    pending=null;
    launch('exam',name,items.map(item=>({question:questions.get(item.id),scored:item.scored})),arrt.id,id==='half'?115:arrt.minutes);
  }
  el('startExam').onclick=()=>{
    if(!lazyForm(el('form').value))return;
    pending={id:el('form').value};
    if(el('tutorial').checked)launch('tutorial','Practice tutorial',tutorial.map(question=>({question,scored:true})),arrt.id,arrt.tutorialMinutes);
    else actualExam();
  };
  el('beginActual').onclick=actualExam;
  el('cancelTutorial').onclick=()=>{pending=null;setup();};
  function finishTutorial(){
    pending=active.pendingExam??pending;
    active=null;save();view('tutorialDone');
  }

  function clock(ms){
    const seconds=Math.ceil(Math.max(0,ms)/1000);
    const mm=Math.floor(seconds/60);
    return mm+':'+String(seconds%60).padStart(2,'0');
  }
  function expire(now=Date.now()){
    if(!active||active.deadline===null||now<active.deadline)return false;
    submit(true);return true;
  }
  function setAnswer(answer){
    if(expire()||active.checked[active.index])return;
    active.answers[active.index]=answer;
    save();render(false);
  }
  function registerVisit(index){
    if(expire())return;
    core.flush(active);active.index=index;active.lastFocus=Date.now();
    showingReview=false;save();render();
  }
  function itemGrid(target){
    const unanswered=active.items.filter((_,i)=>!(active.answers[i]?.length)).length;
    el('unanswered').textContent=unanswered+' unanswered · '+Object.values(active.flags).filter(Boolean).length+' flagged';
    el(target).replaceChildren();
    for(let i=0;i<active.items.length;i++){
      const answered=Boolean(active.answers[i]?.length), flagged=Boolean(active.flags[i]);
      const control=button(String(i+1),()=>registerVisit(i));
      control.className='grid-item'+(answered?' answered':'')+(flagged?' flagged':'');
      control.setAttribute('aria-label','Question '+(i+1)+', '+(answered?'answered':'unanswered')+(flagged?', flagged':''));
      if(i===active.index)control.setAttribute('aria-current','step');
      el(target).append(control);
    }
  }
  function rationale(question){
    const list=node('ul');
    question.options.forEach(([text,why],i)=>{
      const item=node('li');item.append(node('strong',text+' '),node('span',why));
      if(question.key.includes(i)&&question.type!=='order')item.prepend('✓ ');
      list.append(item);
    });
    const block=node('div');
    if(question.type==='order')block.append(node('p','Correct order: '+question.key.map(i=>question.options[i][0]).join(' → ')));
    block.append(list);
    if(question.references?.length){
      const refs=node('ul');
      for(const [label,href] of question.references){
        const row=node('li');row.append(link(label,href));refs.append(row);
      }
      const image=question.image&&RegistryImages[question.image];
      if(image){
        const row=node('li');
        row.append(image.attribution+' · ',link(image.license,image.licenseUrl));
        refs.append(row);
      }
      block.append(refs);
    }
    if(question.related)block.append(link('Review this concept',question.related));
    return block;
  }
  function choices(item,answer,locked){
    const {question}=item, ordered=question.type==='order';
    const choices=el('choices');choices.replaceChildren();
    const current=ordered&&answer.length?answer:item.order;
    for(const [position,id] of current.entries()){
      const text=question.options[id][0];
      if(ordered){
        const row=node('div');row.className='answer';
        row.append(node('div',(position+1)+'. '+text));
        const controls=node('span');controls.className='ordered-actions';
        for(const step of [-1,1]){
          const move=button(step===-1?'↑':'↓',()=>{
            const next=[...current], target=position+step;
            [next[position],next[target]]=[next[target],next[position]];
            setAnswer(next);
          });
          move.setAttribute('aria-label',(step===-1?'Move up ':'Move down ')+text);
          move.disabled=locked||position+step<0||position+step>=current.length;
          controls.append(move);
        }
        row.append(controls);choices.append(row);
        continue;
      }
      const label=node('label');label.className='answer';
      const input=node('input');
      input.type=question.type==='multiple'?'checkbox':'radio';
      input.name='answer';input.value=id;
      input.checked=answer.includes(id);input.disabled=locked;
      input.onchange=()=>{
        if(input.type==='radio')setAnswer([id]);
        else setAnswer(input.checked?[...answer,id]:answer.filter(value=>value!==id));
      };
      label.append(input,node('span',text));choices.append(label);
    }
    if(ordered&&!answer.length){
      const confirmOrder=button('Use this order',()=>setAnswer([...current]));confirmOrder.disabled=locked;
      choices.append(confirmOrder);
    }
  }
  function correctionUrl(id){
    const url=new URL(location.href);
    if(id)url.searchParams.set('correction',id);
    else url.searchParams.delete('correction');
    return url;
  }
  function closeCorrection(id){
    if(history.state?.mriCorrectionFor===id)history.back();
    else {AppNavigation.navigate(correctionUrl(null),true,{mriCorrectionFor:null});render();}
  }
  window.addEventListener('popstate',()=>{if(active)render(false);});
  function render(focus=true){
    if(!active){setup();return;}
    if(expire())return;
    if(showingReview){reviewPage();return;}
    view('session');
    const i=active.index,item=active.items[i],q=item.question,answer=active.answers[i]??[];
    const timedExam=active.mode==='exam', checked=Boolean(active.checked[i]);
    const hintLevel=active.hintLevels?.[i]??Number(Boolean(active.assisted[i]));
    const hintHidden=Boolean(active.hiddenHints?.[i]);
    const attemptId=active.id+':'+i;
    const canTeach=active.mode==='tutor'&&checked&&!core.isCorrect(q,answer);
    if(canTeach&&new URLSearchParams(location.search).get('correction')===attemptId){
      view('registryCorrection');
      StudyGuidance.correction(el('registryCorrection'),q,answer,{back:()=>closeCorrection(attemptId),follow:StudyGuidance.follow(q,bank),save:true});
      return;
    }
    el('sessionTitle').textContent=active.title;
    el('questionCount').textContent='Question '+(i+1)+' of '+active.items.length;
    el('countdown').textContent=active.deadline===null?'Tutor':clock(active.deadline-Date.now());
    el('itemType').textContent={single:'Select one answer',multiple:'Select all that apply',order:'Arrange in order'}[q.type];
    el('stem').textContent=q.stem;
    if(focus){el('stem').focus({preventScroll:true});el('imageZoom').value=1;}
    el('imagePanel').hidden=!q.image;
    if(q.image)RegistryImageView.mount(el('questionImage'),q,{revealed:checked||hintLevel>=3&&!hintHidden,zoom:Number(el('imageZoom').value)});
    choices(item,answer,checked);
    el('prev').disabled=i===0;
    el('next').textContent=i===active.items.length-1?'Review answers':'Next';
    el('flag').setAttribute('aria-pressed',String(Boolean(active.flags[i])));
    el('flag').textContent=active.flags[i]?'Flagged':'Flag';
    StudyGuidance.renderHints(el('registryHints'),el('hint'),el('hideRegistryHint'),q,hintLevel,hintHidden,timedExam||checked||active.mode==='tutorial');
    el('teachRegistry').hidden=!canTeach;
    el('check').hidden=timedExam||checked;
    el('check').disabled=!answer.length;
    const assisted=active.assisted[i];
    const correct=core.isCorrect(q,answer);
    el('message').className=checked?(correct?'correct':'wrong'):'';
    el('message').textContent=checked?(correct?(assisted?'Correct with Hint '+hintLevel+'.':'Correct.'):'Review the explanation.')
      :'';
    el('explanation').hidden=timedExam||!checked;
    el('explanation').replaceChildren();
    if(!timedExam&&checked)el('explanation').append(rationale(q));
    itemGrid('grid');
  }
  el('prev').onclick=()=>registerVisit(active.index-1);
  el('next').onclick=()=>{
    if(active.index===active.items.length-1)reviewPage();
    else registerVisit(active.index+1);
  };
  el('flag').onclick=()=>{
    if(expire())return;
    active.flags[active.index]=!active.flags[active.index];save();render(false);
  };
  el('hint').onclick=()=>{
    if(expire()||active.mode==='exam')return;
    const i=active.index;
    const level=(active.hintLevels?.[i]??Number(Boolean(active.assisted[i])))+1;
    if(level>StudyGuidance.hints(active.items[i].question).length)return;
    (active.hintLevels??={})[i]=level;
    (active.hiddenHints??={})[i]=false;
    active.assisted[i]=true;save();render(false);
  };
  el('hideRegistryHint').onclick=()=>{
    if(!active||active.mode!=='tutor')return;
    const hidden=active.hiddenHints??={};
    hidden[active.index]=!hidden[active.index];save();render(false);
  };
  el('teachRegistry').onclick=()=>{
    if(!active||active.mode!=='tutor'||!active.checked[active.index])return;
    const id=active.id+':'+active.index;
    AppNavigation.navigate(correctionUrl(id),false,{mriCorrectionFor:id});render(false);save();
  };
  el('check').onclick=()=>{
    if(expire()||active.mode==='exam'||!active.answers[active.index]?.length)return;
    const i=active.index;
    if(active.checked[i])return;
    active.checked[i]=true;
    (active.checkedAt??={})[i]=Date.now();
    save();render(false);
  };
  el('review').onclick=()=>reviewPage();
  el('back').onclick=()=>{showingReview=false;render();};
  el('submit').onclick=()=>submit(false);
  el('imageZoom').oninput=()=>{
    const i=active.index,q=active.items[i].question;
    RegistryImageView.mount(el('questionImage'),q,{revealed:Boolean(active.checked[i])||
      active.hintLevels?.[i]>=3&&!active.hiddenHints?.[i],zoom:Number(el('imageZoom').value)});
  };
  el('calculate').onclick=()=>{
    const a=el('first').valueAsNumber,b=el('second').valueAsNumber;
    const op=el('operator').value;
    const value={'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b,sqrt:()=>Math.sqrt(a)}[op]();
    el('calculation').textContent=Number.isFinite(value)?String(Math.round(value*1e9)/1e9):'Enter valid values.';
  };
  function reviewPage(){
    if(expire())return;
    showingReview=true;view('reviewPage');
    const unanswered=active.items.filter((_,i)=>!(active.answers[i]?.length)).length;
    el('reviewText').textContent=unanswered+' unanswered of '+active.items.length+
      (active.deadline===null?'':' · Time remaining '+clock(active.deadline-Date.now()));
    itemGrid('reviewItems');
  }
  function submit(auto){
    if(!active)return;
    if(!auto&&!confirm(active.mode==='tutorial'?'End the tutorial?':'Submit this session? Answers will be locked.'))return;
    if(active.mode==='tutorial'){finishTutorial();return;}
    const completed=core.report(active);
    for(const item of completed.items){
      const key=completed.bankVersion+':'+item.id;
      data.archive[key]??=item.question;
      item.ref=key;delete item.question;
    }
    data.history.unshift(completed);
    active=null;save();showResult(completed);
    if(auto)notice('Time expired. The exam was submitted automatically.');
  }
  function matrix(target,entries){
    const table=node('table');table.className='result-table';
    const header=table.createTHead().insertRow();
    for(const value of ['Topic','Independent correct','Answered','Assisted'])header.append(node('th',value));
    const body=table.createTBody();
    for(const [key,value] of entries){
      const row=body.insertRow();
      const label=key.startsWith('topic:')?key.slice(6):key.startsWith('feature:')?key.slice(8):categoryName(key);
      for(const cell of [label,value.correct+'/'+value.count,String(value.attempts),String(value.assisted)])row.insertCell().textContent=cell;
    }
    el(target).replaceChildren(table);
  }
  function itemReview(item,i){
    const group=node('details');group.className='review-item';
    const mark=!item.answer.length?'Skipped':item.correct?item.assisted?'Correct with Hint '+(item.hintLevel??1):'Correct':'Incorrect';
    const q=item.question??data.archive[item.ref]??questions.get(item.id);
    group.append(node('summary',(i+1)+'. '+mark+' · '+(q?.topic??item.id)+' · '+Math.round(item.ms/1000)+' s'+(item.scored?'':' · simulated pilot')));
    if(q){
      group.append(node('p',q.stem),node('p','Your response: '+(item.answer.map(index=>q.options[index]?.[0]??'').join(' → ')||'Skipped')));
      if(q.image&&RegistryImages[q.image]){
        const frame=node('div');frame.className='image-scroll';
        RegistryImageView.mount(RegistryImageView.layout(frame),q,{revealed:true});group.append(frame);
      }
      group.append(rationale(q));
    }
    return group;
  }
  function showResult(record){
    view('result');
    el('resultTitle').textContent=record.title+' results';
    const percentage=record.eligible?100*record.correct/record.eligible:0;
    el('resultScore').textContent=record.correct+' of '+record.eligible+' independently correct ('+percentage.toFixed(1)+'% raw accuracy). '+
      record.skipped+' skipped · '+record.assisted+' assisted. This is an educational practice result.';
    const groups=Object.entries(record.groups);
    matrix('categoryResults',groups.filter(([key])=>!key.startsWith('topic:')).sort((a,b)=>a[0].localeCompare(b[0])));
    matrix('topicResults',groups.filter(([key])=>key.startsWith('topic:')).sort((a,b)=>
      (b[1].count-b[1].correct)-(a[1].count-a[1].correct)));
    el('missedResults').replaceChildren();el('allResults').replaceChildren();
    record.items.forEach((item,i)=>{
      if(item.scored&&(!item.correct||item.assisted))el('missedResults').append(itemReview(item,i));
      el('allResults').append(itemReview(item,i));
    });
    if(!el('missedResults').children.length)el('missedResults').textContent='No scored items need review in this session.';
  }
  el('resultHome').onclick=setup;
  el('followUp').onclick=()=>{el('category').value='';el('count').value='25';startTutor('weak');};
  let lastPersist=Date.now();
  setInterval(()=>{
    if(!active||expire())return;
    const now=Date.now();
    if(active.deadline!==null){
      if(showingReview)el('reviewText').textContent=active.items.filter((_,i)=>!(active.answers[i]?.length)).length+
        ' unanswered of '+active.items.length+' · Time remaining '+clock(active.deadline-now);
      else el('countdown').textContent=clock(active.deadline-now);
    }
    if(document.visibilityState==='visible'&&now-lastPersist>=5000){core.flush(active,now);lastPersist=now;save();}
  },1000);
  function suspend(){
    if(!active)return;
    core.flush(active);active.lastFocus=null;save();
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')suspend();
    else if(active&&!expire())active.lastFocus=Date.now();
  });
  window.addEventListener('pagehide',suspend);
  if(active){save();render();}else setup();
  if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
