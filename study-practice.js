(async () => {
  const get = id => document.getElementById(id);
  const state = get('studyStatus');
  const node = (tag,text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const button = (title,handler) => {
    const element = node('button',title);
    element.type = 'button';
    element.onclick = handler;
    return element;
  };
  const link = (title,href) => {
    const element = node('a',title);
    element.href = href;
    return element;
  };
  const {bank} = RegistryContent;
  const pool = await RegistryImageView.available(bank.filter(q=>!q.pilot));
  RegistryImageView.layout(get('practiceImageFrame'),'practiceImage');
  RegistryImageView.enablePinch(get('practiceImageFrame'),get('practiceImageZoom'));
  const catalog = new Map([...bank,...StudyVariants.variants].map(q=>[q.id,q]));
  const {subject,summarize,select,dashboard,day,severeThreshold,dateKey} = StudyReview;
  const {difficulty,related,lessons} = StudyContentMap;
  const subjects = ['Mixed Practice','Lower Extremity','Physics','Anatomy','Safety','Procedures','Patient Care','Artifacts','Image Production'];
  for (const id of ['subject','troubleSubject']) {
    for (const name of subjects) get(id).add(new Option(name,name));
  }
  get('bankInfo').textContent = pool.length+' practice questions · '+bank.length+' authored items including simulated pilots · questions cycle after the pool is used';
  const query = new URLSearchParams(location.search);
  const focus=Object.hasOwn(StudyFocus.titles,query.get('focus'))?query.get('focus'):null;
  if(focus){
    document.querySelector('h1').textContent=StudyFocus.titles[focus];
    const count=pool.filter(q=>StudyFocus.matches(q,focus)).length;
    get('bankInfo').textContent=count+' questions in this topic. Finish the full set before questions repeat.';
  }
  const requestedSubject=query.get('subject');
  const subjectScope=subjects.includes(requestedSubject)&&requestedSubject!=='Mixed Practice'?requestedSubject:null;
  if(subjectScope)get('subject').value=subjectScope;
  const requestedLesson = query.get('quiz');
  const requestedRegion = query.get('region');
  const lowerRequested = requestedRegion==='all'||Object.hasOwn(LowerExtremity.regions,requestedRegion);
  LowerExtremity.fill(get('lowerRegion'));
  LowerExtremity.fill(get('troubleLower'));
  if(lowerRequested){
    get('subject').value='Lower Extremity';get('lowerRegion').value=requestedRegion;
    get('troubleSubject').value='Lower Extremity';get('troubleLower').value=requestedRegion;
  }
  const topicLesson = Object.hasOwn(lessons,query.get('topic')) ? query.get('topic') : null;
  const quiz = Object.hasOwn(lessons,requestedLesson) ? requestedLesson : null;
  const retry = pool.some(q=>q.id===query.get('retry'))||StudyVariants.variants.some(q=>q.id===query.get('retry')) ? query.get('retry') : null;
  const chartRequest=query.get('chart');
  const chartParameters=ParameterModel.parameters.filter(p=>chartRequest==='all'||chartRequest===p.id);
  const chartQueue=chartParameters.flatMap(p=>p.quiz.map(index=>ParameterModel.idFor(p,index)));
  const chart=chartQueue.length>0;
  const recordKey = chart ? 'session:lesson:parameter-'+chartRequest : quiz ? 'session:lesson:'+quiz : retry ? 'session:retry:'+retry : focus ? 'session:focus:'+focus : subjectScope ? 'session:focus:subject-'+subjectScope.toLowerCase().replaceAll(' ','-') : 'session';
  let attempts = [], records = new Map(), stats = new Map(), session, response = [], busy = false;
  let shownAt = Date.now(), troubleLimit = 25, incomingPlan = false, clearTopic = false;
  const recalculate = () => {stats = summarize(attempts,records.get('reset')?.value.at);};
  function reportError(error) {
    console.error(error);
    state.textContent = 'Study data could not be saved or loaded. Check browser storage before continuing.';
  }
  async function save(value, attempt) {
    const record = {id:recordKey,value,at:Date.now()};
    await StudyStore.write(record,attempt);
    records.set(record.id,record);
    session = value;
    if (attempt) {attempts.push(attempt);recalculate();}
    updateResume();
  }
  function run(task) {
    return async () => {
      if (busy) return;
      busy = true;
      state.textContent = '';
      try {await task();}
      catch (error) {reportError(error);}
      finally {busy = false;}
    };
  }
  function fresh(plan = {}) {
    return {id:crypto.randomUUID(),mode:quiz||chart?'lesson':retry?'retry':'continuous',number:1,
      recent:[],cycle:[],queue:chart?[...chartQueue]:quiz?[...lessons[quiz]]:retry?[retry]:[],order:[],current:null,
      result:null,hint:false,hintLevel:0,hintsHidden:false,paused:false,ended:false,elapsed:0,
      subject:get('subject').value,lowerRegion:get('lowerRegion').value,difficulty:get('difficulty').value,topic:topicLesson,weak:false,variants:get('useVariants').checked,...plan};
  }
  function clocked() {
    return session.elapsed + (session.paused || session.result ? 0 : Math.max(0,Date.now()-shownAt));
  }
  function filtered(plan) {
    const questions = plan.variants ? [...pool,...StudyVariants.variants] : pool;
    return questions.filter(q => StudyFocus.matches(q,focus) &&
      (!plan.topic || StudyContentMap.lessonFor(q) === plan.topic) &&
      (!subjectScope || subject(q)===subjectScope) &&
      (plan.subject === 'Mixed Practice' || (plan.subject==='Lower Extremity'?LowerExtremity.matches(q,plan.lowerRegion??'all'):subject(q)===plan.subject)) &&
      (plan.difficulty === 'Any' || difficulty(q) === plan.difficulty));
  }
  async function next(plan) {
    const requested = plan.queue[0];
    const eligible=filtered(plan);
    const cycle=plan.cycle??plan.recent;
    const exhausted=eligible.every(q=>cycle.includes(q.id));
    const candidates=StudyFocus.unvisited(eligible,cycle,plan.current);
    const question = requested ? catalog.get(requested) :
      plan.mode === 'continuous' ? select(candidates,attempts,plan,stats) : null;
    if (!question) {
      if (plan.mode !== 'continuous') {
        await save({...plan,ended:true});StudyResume.clear('Study Center');
      } else {
        state.textContent = 'No items match these filters. Choose a different subject or difficulty.';
        if (session && plan.id === session.id) await save({...plan,paused:true});
      }
      render();
      return;
    }
    const window = Math.max(1,Math.min(16,filtered(plan).length-1));
    const recent = [...plan.recent,question.id].slice(-window);
    const order = RegistryCore.shuffle(question.options.map((_,i)=>i));
    await save({...plan,cycle:[...(exhausted?[]:cycle),question.id],current:question.id,result:null,hint:false,hintLevel:0,hintsHidden:false,paused:false,elapsed:0,recent,order,draft:[],
      queue:requested?plan.queue.slice(1):plan.queue});
    response = [];
    shownAt = Date.now();
    render(true);
  }
  function renderAnswerChoices(question) {
    const chosen = session.result?.response ?? response;
    get('practiceInstruction').textContent = question.type === 'order'
      ? 'Tap the choices in the correct order. Tap a selected choice to remove it.'
      : question.type === 'multiple' ? 'Select all that apply.' : 'Select one answer.';
    get('practiceChoices').replaceChildren();
    for (const index of session.order) {
      const row = node('button');
      const selected = chosen.includes(index);
      row.type = 'button';
      row.className = 'answer';
      row.setAttribute('aria-pressed',String(selected));
      row.disabled = Boolean(session.result);
      const wrong = session.result && selected && (question.type==='order'
        ? question.key[chosen.indexOf(index)] !== index : !question.key.includes(index));
      const right = session.result && (question.type==='order'
        ? selected && question.key[chosen.indexOf(index)]===index : question.key.includes(index));
      const text = question.options[index][0];
      row.append(node('span',(question.type==='order' && selected ? (chosen.indexOf(index)+1)+'. ' : '')+text));
      if (wrong || right) {
        row.classList.add(wrong?'choice-bad':'choice-good');
        row.append(node('span',wrong?'✕ Your selection':'✓ Correct choice'));
      }
      row.onclick = run(async () => {
        response = question.type === 'single' ? [index] : selected
          ? response.filter(value=>value!==index) : [...response,index];
        await save({...session,draft:[...response]});
        renderAnswerChoices(question);
        get('practiceChoices').children[session.order.indexOf(index)].focus({preventScroll:true});
      });
      get('practiceChoices').append(row);
    }
    get('checkPractice').disabled = !response.length || (question.type==='order' && response.length!==question.key.length);
  }
  function explanation(question,attempt) {
    const div = node('div');
    if (question.type === 'order') {
      div.append(node('p','Correct order '+question.key.map(index=>question.options[index][0]).join(' → ')));
      if (attempt && !attempt.correct) div.append(node('p','Your sequence '+attempt.response.map(index=>question.options[index]?.[0]).join(' → ')));
    }
    for (const i of new Set([...(attempt?.response??[]),...question.key])) {
      const option = question.options[i];
      if (option) div.append(node('p',option[0]+' — '+option[1]));
    }
    const detail = node('details');
    detail.append(node('summary','All answer explanations and sources'));
    for (const [text,why] of question.options) detail.append(node('p',text+' — '+why));
    for (const [name,url] of question.references) detail.append(link(name,url),node('br'));
    div.append(detail);
    if (related(question)) div.append(link('Review Topic',related(question)));
    return div;
  }
  let currentView='session';
  function updateResume() {
    if(!session||session.ended||!session.current||currentView!=='session')return;
    const href=new URL(location.href);
    href.searchParams.set('recover','1');
    StudyResume.save('Study Center',chart?'Parameter chart':quiz?'Academy quiz':retry?'Question retry':focus?StudyFocus.titles[focus]:'Continuous practice',
      catalog.get(session.current)?.topic??session.subject,'Question '+session.number,href.href);
  }
  function correctionRoute(id) {
    const url=new URL(location.href);
    if(id)url.searchParams.set('correction',id);
    else url.searchParams.delete('correction');
    return url;
  }
  function closeCorrection(){
    const id=session?.result?.id;
    if(history.state?.mriCorrectionFor===id)history.back();
    else {AppNavigation.navigate(correctionRoute(null),true,{mriCorrectionFor:null});render();}
  }
  function render(focus = false) {
    const live = Boolean(session && !session.ended);
    const q = live && !session.paused ? catalog.get(session.current) : null;
    const correcting=q&&session.result&&!session.result.correct&&
      new URLSearchParams(location.search).get('correction')===session.result.id;
    get('practiceCard').hidden = !q||Boolean(correcting);
    const correction=get('practiceCorrection');
    correction.hidden=!correcting;
    if(correcting)StudyGuidance.correction(correction,q,session.result.response,{back:closeCorrection,follow:StudyGuidance.follow(q,pool),save:true});
    get('restartPractice').hidden=!live;
    get('pause').hidden = !live;
    get('end').hidden = !live;
    get('start').hidden = live && !session.paused;
    get('start').textContent = live ? 'Resume' : chart ? 'Start chart challenge' : quiz ? 'Start five-question lesson quiz' : retry ? 'Retry question' : 'Start practice';
    get('pause').hidden = !live || session.paused;
    for (const id of ['subject','difficulty','useVariants']) get(id).disabled = Boolean(quiz || retry || chart);
    get('subject').disabled ||= Boolean(subjectScope);
    const plan = {subject:get('subject').value,lowerRegion:get('lowerRegion').value,difficulty:get('difficulty').value,topic:clearTopic?null:session?.topic??topicLesson,variants:get('useVariants').checked};
    get('clearFocus').hidden = !plan.topic || Boolean(quiz || retry || chart);
    const lower=plan.subject==='Lower Extremity';
    get('lowerFilter').hidden=!lower;
    get('lowerRegion').disabled=Boolean(quiz||retry||chart);
    get('shortLowerTest').hidden=!lower;
    get('shortLowerTest').href='./registry.html?timed=1&region='+encodeURIComponent(plan.lowerRegion);
    const limit = filtered(plan).length;
    get('selectionScope').textContent = chart ? chartQueue.length+' chart cells. Your answers feed Trouble Questions.' : quiz ? 'Five lesson questions. Results feed Trouble Questions.' : retry
      ? 'Focused review of one question.' : (plan.topic ? 'Lesson focus · ' : '')+
      limit+' matching questions. Your new filters take effect when you move to the next question.';
    const sessionAttempts = session ? attempts.filter(a=>a.session===session.id) : [];
    const correct = sessionAttempts.filter(a=>a.correct && !a.hint).length;
    get('sessionStats').textContent = session ? (session.ended?'Session ended · ':'')+correct+' independent correct of '+sessionAttempts.length+
      ' answered · '+sessionAttempts.filter(a=>a.hint).length+' assisted' : '';
    if (!q) return;
    get('practiceNumber').textContent = 'Question '+session.number+(chart?' of '+chartQueue.length:quiz?' of 5':'');
    get('practiceStem').textContent = q.stem;
    if (focus) get('practiceStem').focus();
    const hintLevel=session.hintLevel??Number(Boolean(session.hint));
    const imagePanel=get('practiceImagePanel');
    imagePanel.hidden=!q.image;
    const zoom=get('practiceImageZoom');
    if(focus)zoom.value=1;
    function renderImage(){
      RegistryImageView.mount(get('practiceImage'),q,{revealed:Boolean(session.result)||hintLevel>=3&&!session.hintsHidden,zoom:Number(zoom.value)});
    }
    if(q.image){renderImage();zoom.oninput=renderImage;}
    renderAnswerChoices(q);
    const feedback = get('practiceFeedback');
    feedback.replaceChildren();
    feedback.className = '';
    if (session.result) {
      feedback.className = 'feedback '+(session.result.correct?'good':'bad');
      feedback.append(node('h3',session.result.correct?'✓ CORRECT!':'✕ INCORRECT'));
      if (session.result.hint) feedback.append(node('p',(session.result.correct?'Correct with Hint ':'Highest hint used: ')+(session.result.hintLevel??1)+'. Assisted recall.'));
      feedback.append(explanation(q,session.result));
    }
    StudyGuidance.renderHints(get('practiceHints'),get('practiceHint'),get('hidePracticeHint'),q,hintLevel,session.hintsHidden,Boolean(session.result));
    get('teachPractice').hidden=!session.result||session.result.correct;
    get('checkPractice').hidden = Boolean(session.result);
    get('nextPractice').hidden = !session.result;
    get('nextPractice').textContent = session.mode!=='continuous' && !session.queue.length ? 'Finish review' : 'Next Question';
  }
  function show(name) {
    currentView=name;
    for (const id of ['session','trouble','dashboard']) get(id).hidden = id !== name;
    for (const tab of document.querySelectorAll('[data-view]')) {
      if (tab.dataset.view === name) tab.setAttribute('aria-current','page');
      else tab.removeAttribute('aria-current');
    }
    if (name==='trouble') renderTrouble();
    if (name==='dashboard') renderDashboard();
  }
  function renderTrouble() {
    const filter = get('queueMode').value, now = Date.now();
    const bySubject = get('troubleSubject').value;
    get('troubleLowerFilter').hidden=bySubject!=='Lower Extremity';
    const byDifficulty = get('troubleDifficulty').value;
    const since = get('since').value ? new Date(get('since').value+'T00:00:00').getTime() : 0;
    const min = Number(get('minMisses').value);
    const topic = get('troubleTopic').value.toLowerCase().trim();
    const all = [...pool,...StudyVariants.variants].map(q=>[q,stats.get(q.id),records.get('bookmark:'+q.id)?.value.bookmarked]);
    function matches(q,s,bookmarked) {
      if(bySubject==='Lower Extremity'&&!LowerExtremity.matches(q,get('troubleLower').value))return false;
      if (bySubject!=='Mixed Practice'&&bySubject!=='Lower Extremity'&&subject(q)!==bySubject) return false;
      if (byDifficulty!=='Any' && difficulty(q)!==byDifficulty) return false;
      if (since && (s?.last??0)<since || (s?.misses??0)<min || !q.topic.toLowerCase().includes(topic)) return false;
      if (filter==='Bookmarked Questions') return Boolean(bookmarked);
      if (!s) return false;
      if (filter==='Mastered Questions') return s.mastered;
      if (filter==='Due for Review') return s.due>0 && s.due<=now;
      if (filter==='Recently Missed') return s.lastMiss>now-7*day;
      if (filter==='Repeatedly Missed') return s.misses>=2;
      if (filter==='Severe Weaknesses') return s.misses>=severeThreshold && !s.mastered;
      return s.misses>0;
    }
    const rows = all.filter(row=>matches(...row)).sort((a,b)=>(b[1]?.misses??0)-(a[1]?.misses??0)||(b[1]?.last??0)-(a[1]?.last??0));
    get('troubleCount').textContent = rows.length ? rows.length+' matching questions' : 'No questions match these filters.';
    get('moreTrouble').hidden = rows.length<=troubleLimit;
    get('troubleRows').replaceChildren();
    for (const [q,s,bookmarked] of rows.slice(0,troubleLimit)) {
      const area = node('article');
      const date = s?.last ? new Date(s.last).toLocaleDateString() : 'No attempts yet';
      const heading = node('h3',q.topic);
      const controls = node('div');controls.className = 'controls';
      controls.append(link('Retry Question','./practice.html?retry='+encodeURIComponent(q.id)));
      if (related(q)) controls.append(link(q.image?'Open Anatomy Image':StudyContentMap.lessonFor(q)?'Open Physics Lesson':'Open Reference',related(q)));
      controls.append(button(bookmarked?'Remove bookmark':'Bookmark Question',run(async()=>{
        const record = {id:'bookmark:'+q.id,value:{bookmarked:!bookmarked},at:Date.now()};
        await StudyStore.write(record);records.set(record.id,record);renderTrouble();
      })));
      const details = node('details');
      details.append(node('summary','Review Explanation'));
      const lastMiss = attempts.filter(a=>a.question===q.id&&!a.correct).sort((a,b)=>b.at-a.at)[0];
      details.append(explanation(q,lastMiss));
      const note = node('details');
      const field = node('textarea');field.className = 'study-note';field.rows = 3;field.setAttribute('aria-label','Personal note for '+q.topic);
      const saved = node('p');saved.setAttribute('role','status');
      note.append(node('summary','Add Personal Note'),field,button('Save to notebook',()=>{
        if (!field.value.trim()) return;
        try {StudyStore.note('practice:'+q.id,q.topic+'\n'+field.value.trim());field.value='';saved.textContent='Saved in My Study Space.';}
        catch(error) {reportError(error);}
      }),saved);
      area.append(heading,node('p',q.stem),node('p',(s?.misses??0)+' misses · '+date+' · '+difficulty(q)),controls,details,note);
      get('troubleRows').append(area);
    }
  }
  function renderDashboard() {
    const result = dashboard(attempts);
    const due = [...stats.values()].filter(row=>row.due>0&&row.due<=Date.now()).length;
    const conceptProgress = new Map();
    for (const [id,row] of stats) {
      const q=catalog.get(id);
      if (q) conceptProgress.set(q.topic,(conceptProgress.get(q.topic)??true) && row.mastered);
    }
    const mastered = [...conceptProgress.values()].filter(Boolean).length;
    const metrics = node('div');metrics.className = 'study-metrics';
    for (const [label,value] of [['Answered today',result.today],['Total answered',result.total],['Due for review',due],
      ['Study streak (days)',result.streak],['Concepts mastered across attempted items',mastered]]) {
      const metric = node('div');metric.append(node('strong',value),node('span',label));metrics.append(metric);
    }
    get('dashboardStats').replaceChildren(metrics);
    function table(id,items) {
      const list = node('ul');
      for (const text of items) list.append(node('li',text));
      get(id).replaceChildren(items.length?list:node('p','Answer practice questions to see this breakdown.'));
    }
    const score = row => row.correct+' of '+row.n+' independent correct · '+Math.round(100*row.correct/row.n)+'%';
    table('dashboardSubjects',[...result.topics].map(([name,row])=>name+' · '+score(row)));
    const topicRows = new Map();
    for (const a of attempts) {
      const row = topicRows.get(a.topic)??{n:0,correct:0};
      row.n++;row.correct+=Number(a.correct&&!a.hint);topicRows.set(a.topic,row);
    }
    const weakTopics=[...topicRows].filter(([,r])=>r.correct<r.n).sort(([,a],[,b])=>
      a.correct/a.n-b.correct/b.n||b.n-a.n).slice(0,5);
    table('dashboardTopics',weakTopics.map(([name,row])=>name+' · '+score(row)));
    get('suggestion').textContent=due ? 'Suggested next session · Review '+due+' due questions.' : weakTopics.length
      ? 'Suggested next session · Reinforce '+weakTopics[0][0]+'.' : 'Suggested next session · Start mixed practice.';
    get('duePractice').hidden=!due;
    get('duePractice').href='./practice.html?view=trouble&filter=due';
    table('dashboardDays',[...result.history].sort(([a],[b])=>b-a).slice(0,10).map(([date,row])=>
      new Date(date*day).toLocaleDateString(undefined,{timeZone:'UTC'})+' · '+score(row)));
  }
  function getLegacy() {
    let saved;
    try {saved = RegistryCore.read(localStorage);}
    catch {return [];}
    const previous=saved.history.filter(entry=>entry.mode==='tutor');
    const current=saved.active;
    if(current?.mode==='tutor')previous.push({
      id:current.id,date:new Date().toISOString(),
      items:current.items.map(({question},index)=>({
        id:question.id,question,answer:current.checked[index]?current.answers[index]:null,
        correct:RegistryCore.isCorrect(question,current.answers[index]),assisted:current.assisted[index],
        hintLevel:current.hintLevels?.[index],checkedAt:current.checkedAt?.[index],ms:current.elapsed[index]
      }))
    });
    return previous.flatMap(legacy=>legacy.items.flatMap((item,index)=>{
      const q=catalog.get(item.id),at=item.checkedAt??Date.parse(legacy.date);
      if(!q||!item.answer?.length||!Number.isFinite(at))return [];
      return [{id:'legacy:'+legacy.id+':'+index,question:q.id,version:(item.question??saved.archive?.[item.ref])?.version??'1',
        at,topic:q.topic,subject:subject(q),session:legacy.id,mode:'legacy-tutor',response:item.answer,
        correct:Boolean(item.correct),hint:Boolean(item.assisted),hintLevel:item.hintLevel??Number(Boolean(item.assisted)),ms:item.ms??0}];
    }));
  }
  try {
    const data = await StudyStore.snapshot();
    const existing = new Set(data.attempts.map(a=>a.id));
    const migrated = getLegacy().filter(a=>!existing.has(a.id));
    if (migrated.length) await StudyStore.merge({version:1,attempts:migrated,records:[]});
    attempts = [...data.attempts,...migrated];
    records = new Map(data.records.map(row=>[row.id,row]));
    session = records.get(recordKey)?.value;
    if (session) {
      response = session.draft??[];
      if(!lowerRequested){
        get('subject').value = session.subject;
        get('lowerRegion').value = session.lowerRegion??'all';
      }else if(session.mode==='continuous'&&!session.ended){
        await save({...session,subject:'Lower Extremity',lowerRegion:requestedRegion,topic:null});
      }
      get('difficulty').value = session.difficulty;
      get('useVariants').checked = Boolean(session.variants);
      if (topicLesson && topicLesson!==session.topic) incomingPlan = true;
    }
    recalculate();
  } catch (error) {reportError(error);get('start').disabled=true;return;}
  get('start').disabled=false;
  function routePractice(){
    const route=new URLSearchParams(location.search).get('view');
    show(['trouble','dashboard'].includes(route)?route:'session');
    if(route==='trouble'&&new URLSearchParams(location.search).has('due')){
      get('queueMode').value='Due for Review';renderTrouble();
    }
    render();
    updateResume();
  }
  window.addEventListener('popstate',routePractice);
  for (const tab of document.querySelectorAll('[data-view]')) tab.onclick = ()=>{
    const url=correctionRoute(null);
    if(tab.dataset.view==='session')url.searchParams.delete('view');
    else url.searchParams.set('view',tab.dataset.view);
    AppNavigation.navigate(url,false,{mriCorrectionFor:null});
    routePractice();
  };
  for (const id of ['queueMode','troubleSubject','troubleLower','since','minMisses','troubleDifficulty','troubleTopic']) {
    get(id).oninput = () => {troubleLimit=25;renderTrouble();};
  }
  get('moreTrouble').onclick = ()=>{troubleLimit+=25;renderTrouble();};
  for (const id of ['subject','lowerRegion','difficulty','useVariants']) get(id).onchange = run(async()=>{
    const nextSubject=get('subject').value;
    if(nextSubject==='Lower Extremity'){clearTopic=true;incomingPlan=false;}
    if (session) await save({...session,subject:nextSubject,lowerRegion:get('lowerRegion').value,difficulty:get('difficulty').value,variants:get('useVariants').checked,topic:clearTopic?null:session.topic});
    render();
  });
  const start = async () => {
    if (session && !session.ended && session.current) {
      await save({...session,paused:false});shownAt=Date.now();render(true);
    } else await next(fresh({topic:clearTopic?null:topicLesson}));
  };
  get('clearFocus').onclick = run(async()=>{
    clearTopic=true;
    incomingPlan=false;
    if (session) await save({...session,topic:null});
    render();
  });
  get('start').onclick = run(start);
  get('pause').onclick = run(async()=>{await save({...session,elapsed:clocked(),paused:true});render();});
  get('end').onclick = run(async()=>{
    if (confirm('End this practice session? Answered questions will stay in your history.')) {
      await save({...session,ended:true});StudyResume.clear('Study Center');render();
    }
  });
  get('practiceHint').onclick = run(async()=>{
    const level=(session.hintLevel??Number(Boolean(session.hint)))+1;
    if(level>StudyGuidance.hints(catalog.get(session.current)).length)return;
    await save({...session,hint:true,hintLevel:level,hintsHidden:false});render();
  });
  get('hidePracticeHint').onclick=run(async()=>{await save({...session,hintsHidden:!session.hintsHidden});render();});
  get('teachPractice').onclick=()=>{
    const id=session?.result?.id;
    if(id&&!session.result.correct){
      AppNavigation.navigate(correctionRoute(id),false,{mriCorrectionFor:id});
      render();updateResume();get('practiceCorrection').scrollIntoView({block:'start'});
    }
  };
  get('restartPractice').onclick=run(async()=>{
    if(!confirm('Start a new session? Answer history will be kept.'))return;
    AppNavigation.navigate(correctionRoute(null),true,{mriCorrectionFor:null});
    await next(fresh({topic:clearTopic?null:topicLesson}));
  });
  get('checkPractice').onclick = run(async()=>{
    if (session.result || !response.length) return;
    const q = catalog.get(session.current);
    const attempt = {id:session.id+':'+session.number,question:q.id,version:q.version,at:Date.now(),
      topic:q.topic,subject:subject(q),response:[...response],correct:RegistryCore.isCorrect(q,response),
      hint:session.hint,hintLevel:session.hintLevel??Number(Boolean(session.hint)),ms:clocked(),session:session.id,mode:session.mode};
    await save({...session,result:attempt},attempt);
    render();
  });
  get('nextPractice').onclick = run(async()=>{
    const plan = {...session,number:session.number+1};
    if (incomingPlan) {plan.topic=topicLesson;incomingPlan=false;}
    await next(plan);
  });
  get('weakPractice').onclick = run(async()=>{
    if (quiz || retry || chart) {location.href='./practice.html?weak=1';return;}
    const route=correctionRoute(null);route.searchParams.delete('view');
    AppNavigation.navigate(route);show('session');
    get('subject').value = 'Mixed Practice';
    get('difficulty').value = 'Any';
    if (session && !session.ended) {
      await save({...session,topic:null,weak:true,subject:'Mixed Practice',difficulty:'Any'});
      state.textContent='Weak-area selection is active for the next question.';
      render();
    } else await next(fresh({topic:null,weak:true}));
  });
  get('resetMastery').onclick = run(async()=>{
    if (!confirm('Reset mastery and review intervals? Past answers, mistakes, and notes will stay in your history.')) return;
    const record = {id:'reset',value:{at:Date.now()},at:Date.now()};
    await StudyStore.write(record);records.set(record.id,record);recalculate();renderDashboard();
  });
  document.addEventListener('visibilitychange',()=>{
    if (document.visibilityState==='hidden' && session && !session.ended && !session.paused && !session.result && !busy) {
      const value = {...session,elapsed:clocked()};
      shownAt=Date.now();
      save(value).catch(reportError);
    } else if (document.visibilityState==='visible') shownAt=Date.now();
  });
  if (query.get('filter')==='due')get('queueMode').value='Due for Review';
  routePractice();
  if(query.has('recover')&&session?.paused&&!session.ended)await get('start').onclick();
  window.addEventListener('pageshow',event=>{if(event.persisted)updateResume();});
  if (incomingPlan) state.textContent='The linked lesson focus will start on your next question.';
  if (query.has('weak')) await get('weakPractice').onclick();
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
