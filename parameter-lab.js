(() => {
  const el=id=>document.getElementById(id);
  const {parameters,labels,baseline,estimate,idFor}=ParameterModel;
  const choice=el('parameterChoice'), direction=el('parameterDirection');
  const node=(tag,value)=>{const item=document.createElement(tag);item.textContent=value;return item;};
  const definitions=[['tr','TR (ms)',250,3000,50],['te','Effective TE (ms)',10,160,5],['fov','Phase FOV (mm)',140,360,10],
    ['matrix','Phase lines',80,320,16],['thickness','Slice thickness (mm)',2,8,1],['nex','NEX',1,4,1],
    ['bandwidth','Bandwidth (Hz/pixel)',110,550,10],['etl','ETL',1,16,1]];
  const scenarios=[
    ['noise','Insufficient SNR','Improve the averages/bandwidth SNR factor by at least 40% without increasing chemical shift. Time may increase.',
      (a,b)=>a.snrFactor>=1.4*b.snrFactor&&a.shift<=b.shift,'Additional averages reduce random noise and add acquisition time.'],
    ['time','Excessive scan time','Reduce ideal acquisition time by at least 25%. Preserve TR, TE, sampling geometry, NEX and bandwidth.',
      (a,b,p)=>a.time<=.75*b.time&&Object.entries(baseline).every(([key,value])=>key==='etl'||p[key]===value),
      'A longer echo train reduces the number of shots, but echo-train blurring and RF load can increase.'],
    ['partial','Partial-volume averaging','Reduce thickness to 3 mm or less while keeping in-plane pitch at baseline.',
      (a,b,p)=>p.thickness<=3&&a.pitch===b.pitch,'Thinner slices improve through-plane detail and reduce voxel signal at the same noise level.'],
    ['shift','Chemical shift type 1','Reduce fat–water displacement to at most one acquired pixel.',
      a=>a.shift<=1,'Wider receiver bandwidth reduces fat–water misregistration and lowers SNR if other conditions remain fixed.'],
    ['wrap','Phase wraparound','Cover a 280 mm wide object in phase while preserving or improving baseline phase detail.',
      (a,b,p)=>p.fov>=280&&a.pitch<=b.pitch,'Increasing phase FOV can avoid wrap. Adding phase lines preserves pixel pitch and can lengthen the acquisition.'],
    ['detail','Poor in-plane detail','Improve acquired phase pitch to 1.1 mm or less without narrowing the baseline phase FOV.',
      (a,b,p)=>a.pitch<=1.1&&p.fov>=baseline.fov,'More phase lines improve nominal detail and can reduce voxel SNR and lengthen the scan.']
  ];
  choice.append(...parameters.map(p=>new Option(p.name,p.id)));
  function route(){
    const selected=new URLSearchParams(location.search).get('parameter');
    choice.value=parameters.some(p=>p.id===selected)?selected:parameters[0].id;
    renderReference();
  }
  function renderReference(){
    const p=parameters.find(item=>item.id===choice.value);
    el('parameterAssumptions').textContent=p.assumptions;
    const down=direction.value==='down';
    el('parameterEffects').replaceChildren(...p.effects.map(effect=>{
      const d=down?({'+':'-','-':'+'})[effect.direction]??effect.direction:effect.direction;
      const item=node('div','');
      item.append(node('dt',effect.metric),node('dd',({'+' :'↑','-':'↓','=':'↔','?':'?'})[d]+' '+labels[d]),
        node('dd',(down&&d!==effect.direction?'For an increase: ':'')+effect.why));
      return item;
    }));
    el('parameterCell').href='./practice.html?retry='+idFor(p,p.quiz[0]);
    el('parameterRow').href='./practice.html?chart='+p.id;
    el('parameterLesson').href='./academy.html?lesson='+p.lesson;
    el('parameterSource').textContent=p.source[0];el('parameterSource').href=p.source[1];
  }
  choice.onchange=()=>{AppNavigation.navigate('?parameter='+choice.value);renderReference();};
  direction.onchange=renderReference;
  window.addEventListener('popstate',route);
  const table=el('parameterChart');
  const heading=table.createTHead().insertRow();
  for(const text of ['Parameter',...parameters[0].effects.map(effect=>effect.metric)]){
    const th=node('th',text);th.scope='col';heading.append(th);
  }
  const body=table.createTBody();
  const cells=new Map();
  for(const p of parameters){
    const row=body.insertRow(), name=node('th',p.name);
    name.scope='row';row.append(name);
    for(const [index,effect] of p.effects.entries()){
      const cell=row.insertCell();
      if(!p.quiz.includes(index)){cell.textContent='—';continue;}
      const id=idFor(p,index);
      const link=node('a','Answer');
      link.href='./practice.html?retry='+id;
      const title=p.name+' · '+effect.metric;
      link.setAttribute('aria-label','Answer '+title);
      cell.append(link);cells.set(id,{link,title});
    }
  }
  async function refreshMastery(){
    try{
      const data=await StudyStore.snapshot();
      const reset=data.records.find(row=>row.id==='reset')?.value.at;
      const stats=StudyReview.summarize(data.attempts,reset);
      for(const [id,{link,title}] of cells){
        const status=stats.get(id);
        link.textContent=status?.mastered?'Mastered':status?'Retry':'Answer';
        link.setAttribute('aria-label',link.textContent+' '+title);
      }
    }catch{ /* The reference remains available if study storage is unavailable. */ }
  }
  window.addEventListener('pageshow',refreshMastery);
  const scenario=el('fixScenario');
  scenario.append(...scenarios.map(([id,title])=>new Option(title,id)));
  const fields=Object.fromEntries(definitions.map(([id,label,min,max,step])=>{
    const input=document.createElement('input');
    Object.assign(input,{type:'number',min,max,step,value:baseline[id],required:true,inputMode:'numeric'});
    const field=node('label',label);field.append(input);el('protocolFields').append(field);
    input.oninput=()=>{el('scenarioFeedback').textContent='';renderProtocol();};
    return [id,input];
  }));
  function settings(){
    if(Object.values(fields).some(input=>!input.validity.valid))return null;
    const result=Object.fromEntries(Object.entries(fields).map(([id,input])=>[id,input.valueAsNumber]));
    return result.te<result.tr?result:null;
  }
  const start=estimate(baseline);
  function renderProtocol(){
    const p=settings();
    el('checkProtocol').disabled=!p;
    if(!p){el('scenarioFeedback').textContent='Use the allowed input values and keep TE shorter than TR.';return;}
    const result=estimate(p);
    const readouts=[['Ideal acquisition time','time','s'],['Acquired phase pitch','pitch','mm'],['Voxel volume','voxel','mm³'],
      ['Noise factor for NEX and bandwidth only','snrFactor','× SNR'],['Type 1 chemical shift','shift','pixels']];
    el('protocolReadouts').replaceChildren(...readouts.map(([label,key,unit])=>{
      const item=node('div','');
      item.append(node('dt',label),node('dd',result[key].toFixed(2)+' '+unit+' · baseline '+start[key].toFixed(2)+' '+unit));
      return item;
    }));
    el('parameterSignal').replaceChildren(...[['softTissue','Illustrative short-T1 tissue'],['fluid','Illustrative long-T1 fluid']].map(([key,label])=>{
      const amount=Math.round(100*result[key]);const line=node('label',label+' · '+amount+'% normalized spin-echo signal');
      const meter=document.createElement('meter');meter.min=0;meter.max=1;meter.value=result[key];line.append(meter);return line;
    }));
  }
  function reset(){
    for(const [id,value] of Object.entries(baseline))fields[id].value=value;
    el('scenarioPrompt').textContent=scenarios.find(row=>row[0]===scenario.value)[2];
    el('scenarioFeedback').textContent='';renderProtocol();
  }
  scenario.onchange=reset;el('resetProtocol').onclick=reset;
  el('checkProtocol').onclick=()=>{
    const p=settings();if(!p)return;
    const entry=scenarios.find(row=>row[0]===scenario.value);
    el('scenarioFeedback').textContent=(entry[3](estimate(p),start,p)?'✓ Target met. ':'✕ Target unmet. ')+entry[4];
  };
  route();reset();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
