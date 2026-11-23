(() => {
  const version='registry-bank-2';
  const storageKey='mri.registry.v1';
  const day=86400000;
  const shuffle=(values,random=Math.random)=>{
    const items=[...values];
    for(let i=items.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [items[i],items[j]]=[items[j],items[i]];
    }
    return items;
  };
  function seeded(seed) {
    let state=2166136261;
    for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
    return ()=>{
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      return state/4294967296;
    };
  }
  const eligibleImage = q => globalThis.RegistryImageView?.valid(q)??true;
  function buildForm(bank,blueprint,form='A') {
    const random=seeded(blueprint.id+':'+form);
    const randomForm=form==='random';
    if(!randomForm&&!/^[A-E]$/.test(form))return null;
    const offset=randomForm?0:form.charCodeAt(0)-65;
    const items=[];
    for(const [category,[,count]] of Object.entries(blueprint.categories)){
      const pool=bank.filter(q=>q.category===category&&eligibleImage(q)&&!q.pilot&&!q.studyOnly&&blueprint.formats.includes(q.type));
      const eligible=randomForm?shuffle(pool):pool.slice(offset*count);
      if(eligible.length<count||(randomForm&&pool.length===count))return null;
      items.push(...eligible.slice(0,count).map(({id})=>({id,scored:true})));
    }
    const pilots=bank.filter(q=>q.pilot&&eligibleImage(q)&&!q.studyOnly&&blueprint.formats.includes(q.type));
    const pool=randomForm?shuffle(pilots):pilots.slice(offset*blueprint.pilot);
    if(pool.length<blueprint.pilot)return null;
    items.push(...pool.slice(0,blueprint.pilot).map(({id})=>({id,scored:false})));
    return shuffle(items,randomForm?Math.random:random);
  }

  function isCorrect(question,answer) {
    if(!Array.isArray(answer)||answer.length!==question.key.length)return false;
    if(question.type==='order')return question.key.every((id,i)=>id===answer[i]);
    return new Set(answer).size===answer.length&&question.key.every(id=>answer.includes(id));
  }
  function makeRun({mode,title,items,blueprint=null,minutes=null,now=Date.now()}) {
    return {
      id:globalThis.crypto.randomUUID(),bankVersion:version,mode,title,blueprint,
      started:now,deadline:minutes==null?null:now+minutes*60000,lastFocus:now,
      items:items.map((item,i)=>({...item,order:shuffle(item.question.options.map((_,j)=>j),seeded(String(now)+':'+i))})),
      answers:{}, flags:{}, assisted:{}, elapsed:{}, checked:{}, index:0
    };
  }
  function flush(run,now=Date.now()){
    const cutoff=run.deadline==null?now:Math.min(run.deadline,now);
    const ms=Math.max(0,cutoff-run.lastFocus);
    if(run.lastFocus!==null)run.elapsed[run.index]=(run.elapsed[run.index]??0)+ms;
    run.lastFocus=now;
  }
  function report(run,now=Date.now()){
    flush(run,now);
    const groups={}, items=[];
    let eligible=0,correct=0,assisted=0,skipped=0;
    for(const [i,item] of run.items.entries()){
      const question=item.question, answer=run.answers[i]??[];
      const succeeded=isCorrect(question,answer), helped=Boolean(run.assisted[i]);
      items.push({id:question.id,question,answer,correct:succeeded,assisted:helped,
        hintLevel:run.hintLevels?.[i]??Number(helped),checkedAt:run.checkedAt?.[i],scored:item.scored,ms:run.elapsed[i]??0});
      if(!item.scored)continue;
      eligible++;skipped+=Number(!answer.length);
      assisted+=Number(helped);
      correct+=Number(succeeded&&!helped);
      const keys=[question.category,'topic:'+question.topic];
      if(question.image)keys.push('feature:Visual questions');
      if(question.formula)keys.push('feature:Calculations');
      for(const key of keys){
        const row=groups[key]??={count:0,correct:0,attempts:0,assisted:0};
        row.count++;row.attempts+=Number(answer.length>0);
        row.correct+=Number(succeeded&&!helped);row.assisted+=Number(helped);
      }
    }
    return {id:run.id,title:run.title,mode:run.mode,blueprint:run.blueprint,
      bankVersion:run.bankVersion,date:new Date(now).toISOString(),eligible,correct,assisted,skipped,groups,items};
  }
  function selectTutor(bank,history,{count,category,subject,kind='mixed',armrit=false,now=Date.now()}){
    const outcomes=new Map();
    const topics=new Map();
    const byId=new Map(bank.map(question=>[question.id,question]));
    for(const entry of [...history].reverse())for(const item of entry.items){
      if(!item.scored)continue;
      const question=byId.get(item.id);
      const old=outcomes.get(item.id)??{streak:0};
      const independent=item.correct&&!item.assisted;
      const streak=independent?old.streak+1:0;
      if(question){
        for(const key of [question.category,question.category+':'+question.topic]){
          const row=topics.get(key)??{count:0,missed:0};
          row.count++;row.missed+=Number(!independent);
          topics.set(key,row);
        }
      }
      outcomes.set(item.id,{streak,missed:!independent,due:Date.parse(entry.date)+Math.min(30,2**streak)*day});
    }
    const pool=bank.filter(q=>!q.pilot&&eligibleImage(q)&&(!category||q.category===category)&&(!subject||q.armritSubject===subject)&&
      (!armrit||q.type==='single')&&
      (kind!=='image'||q.image)&&(kind!=='calc'||q.formula)&&
      (kind!=='missed'||outcomes.get(q.id)?.missed)&&
      (kind!=='due'||(outcomes.has(q.id)&&outcomes.get(q.id).due<=now)));
    const random=kind==='daily'?seeded(new Date(now).toISOString().slice(0,10)):Math.random;
    const weighted=shuffle(pool,random);
    if(kind==='weak'){
      const missRate=key=>{
        const record=topics.get(key);
        return record?record.missed/record.count:0;
      };
      const priority=q=>2*Number(outcomes.get(q.id)?.missed??false)+
        missRate(q.category+':'+q.topic)+0.75*missRate(q.category);
      weighted.sort((a,b)=>priority(b)-priority(a));
    }else if(kind==='missed'||kind==='due'){
      weighted.sort((a,b)=>Number(outcomes.get(b.id)?.missed??false)-Number(outcomes.get(a.id)?.missed??false));
    }
    return weighted.slice(0,count);
  }
  function read(storage){
    const raw=storage.getItem(storageKey);
    if(!raw)return {history:[],active:null};
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed.history)||!('active' in parsed))throw Error('Invalid saved registry data.');
    return parsed;
  }
  function save(storage,data){storage.setItem(storageKey,JSON.stringify(data));}
  globalThis.RegistryCore={version,storageKey,shuffle,seeded,buildForm,isCorrect,makeRun,flush,report,selectTutor,read,save};
})();
