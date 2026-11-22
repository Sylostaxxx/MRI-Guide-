(() => {
  const el=id=>document.getElementById(id), {cases}=StudyContent;
  const sections={systems:'Organ systems',artifact:'Artifact Simulator',sequence:'Sequence Recognition',
    positioning:'Patient Positioning',pathology:'Pathology Explorer',safety:'MRI Safety',
    rotation:'Virtual Clinical Rotation',mastery:'My Mastery'};
  const historyKey='mri-study-lab-review-v1';
  const read=()=>JSON.parse(localStorage.getItem(historyKey)??'[]');
  let course='systems', step=0, score=0;
  function button(text,click) {
    const b=document.createElement('button');b.textContent=text;b.onclick=click;return b;
  }
  function show(section) {
    course=section;step=0;score=0;
    const area={systems:'anatomy',pathology:'anatomy',artifact:'physics',sequence:'practice',mastery:'study'};
    AppNavigation.active(area[section]??'clinical');
    el('studyTitle').textContent=section==='systems'?'Anatomy Explorer':'Study Center';

    for (const key of ['systems','artifact','activity','mastery']) el(key).hidden=key!==(cases[course]?'activity':course);
    for (const node of el('sections').children) node.setAttribute('aria-current',String(node.dataset.section===section));
    if (section==='artifact') artifact();
    if (section==='mastery') mastery();
    if (cases[section]) exercise();
  }
  for (const [key,name] of Object.entries(sections)) {
    const control=button(name,()=>show(key));control.dataset.section=key;el('sections').append(control);
  }

  const regions=[...new Set(OrganCatalog.flatMap(system=>system.entries.map(entry=>entry.region)))].sort();
  for(const name of regions)el('bodyRegion').add(new Option(name,name));
  const match=entry=>!el('bodyRegion').value||entry.region===el('bodyRegion').value;
  let activeOrgan;
  const sharedIds={'1':'knee1:1','3':'cerebra1:62','3.1':'cerebra1:91','5':'cardiac1:1'};

  function updateSystems() {
    const previous=el('system').value;
    el('system').replaceChildren();
    OrganCatalog.forEach(({system,entries},index)=>{
      if(entries.some(match))el('system').add(new Option(system,index));
    });
    if([...el('system').options].some(option=>option.value===previous))el('system').value=previous;
    updateOrganChoices();
  }
  function updateOrganChoices() {
    const entries=OrganCatalog[Number(el('system').value)].entries.filter(match);
    el('organChoice').replaceChildren(...entries.map(entry=>new Option(entry.name,entry.id)));
    organ();
  }
  function organ() {
    const entry=activeOrgan=OrganCatalog[Number(el('system').value)].entries.find(item=>item.id===el('organChoice').value);
    const {name,location,role,pathology,plate:plateId,mri,target,facts}=entry;
    const plate=AnatomyPlates[plateId];
    el('structure').textContent=name;el('location').textContent=location;
    el('function').textContent=role;el('pathologyText').textContent=pathology;
    el('diagram').src=plate.asset;el('diagram').alt=plate.title;
    const source=document.createElement('a');source.href=plate.source;source.textContent=plate.title;
    const license=document.createElement('a');license.href=plate.licenseUrl;license.textContent=plate.license;
    el('diagramCredit').replaceChildren(source,' · '+plate.author+' · ',license);
    el('organDetails').replaceChildren();
    facts?.forEach((value,i)=>{
      const term=document.createElement('dt'),text=document.createElement('dd');
      term.textContent=['Neighbors','MRI appearance','Relevant sequences','Clinical significance'][i];
      text.textContent=value;el('organDetails').append(term,text);
    });
    el('mri').replaceChildren();
    if (mri) {
      const link=document.createElement('a');
      const params=new URLSearchParams({region:mri,structure:target});
      link.href=sharedIds[entry.id]?AtlasStudy.link(sharedIds[entry.id]):'./brain-atlas.html?'+params;
      link.textContent='Open the corresponding real MRI structure';
      el('mri').append(link);
    } else el('mri').textContent='A corresponding labeled MRI is unavailable in this collection.';
    el('organStatus').textContent='';
    try { el('organNote').value=sharedIds[entry.id]?AtlasStudy.readNote(sharedIds[entry.id]):localStorage.getItem('mri.scan.note.system.'+entry.id)??''; }
    catch { el('organNote').value='';el('organStatus').textContent='Browser storage unavailable.'; }
  }
  el('bodyRegion').onchange=updateSystems;
  el('system').onchange=updateOrganChoices;
  el('organChoice').onchange=organ;
  el('organSave').onclick=()=>{
    try {
      if(sharedIds[activeOrgan.id])AtlasStudy.saveNote(sharedIds[activeOrgan.id],el('organNote').value);
      else localStorage.setItem('mri.scan.note.system.'+activeOrgan.id,el('organNote').value);
      el('organStatus').textContent='Structure note saved.';
    } catch { el('organStatus').textContent='Structure note could not be saved.'; }
  };

  function exercise() {
    const items=cases[course];
    el('activityTitle').textContent=sections[course];
    el('choices').replaceChildren();
    el('next').hidden=true;
    el('feedback').textContent='';
    el('safetyReference').hidden=course!=='rotation'&&course!=='safety';
    if (step===items.length) {
      el('caseCount').textContent='Complete';
      el('stem').textContent=score+' of '+items.length+' correct on this run.';
      el('choices').append(button('Practice again',()=>show(course)));
      if (course==='rotation') {
        const link=document.createElement('a');link.href='./';link.textContent='Open Slice Planner for hands-on practice';
        el('choices').append(link);
      }
      return;
    }
    const [question,options,correct,explanation]=items[step];
    el('caseCount').textContent=(step+1)+' of '+items.length;
    el('stem').textContent=question;
    options.forEach((option,index)=>el('choices').append(button(option,()=>{
      const ok=index===correct;
      score+=Number(ok);
      for (const choice of el('choices').children) choice.disabled=true;
      el('feedback').textContent=(ok?'Correct. ':'Review. ')+explanation;
      try {
        const attempts=read();
        attempts.unshift({topic:'training:'+course,ok,date:new Date().toISOString()});
        localStorage.setItem(historyKey,JSON.stringify(attempts));
      } catch { el('feedback').textContent+=' Progress could not be saved.'; }
      el('next').hidden=false;
      el('next').textContent=step===items.length-1?'See results':'Next';
    })));
  }
  el('next').onclick=()=>{step++;exercise();};

  function mastery() {
    const totals=new Map(), recent=el('studyHistory');
    recent.replaceChildren();
    try {
      for (const [i,attempt] of read().entries()) {
        const [family,id]=attempt.topic.split(':');
        const name=family==='training'?(sections[id]??'Training'):family==='illustrated'?'Illustrated anatomy':({
          cerebra:'Brain atlas',cerebra1:'Brain atlas',spine1:'Spine atlas',knee1:'Knee atlas',cardiac1:'Cardiac atlas'
        }[family]??'Pre-study quiz');
        if(i<20){
          const item=document.createElement('li');
          const result=attempt.assisted?'Assisted':attempt.ok?'Correct':'Missed';
          item.textContent=name+' · '+result+' · '+new Date(attempt.date).toLocaleDateString();
          recent.append(item);
        }
        const row=totals.get(name)??{independent:0,correct:0,assisted:0};
        if (attempt.assisted) row.assisted++;
        else { row.independent++;row.correct+=Number(attempt.ok); }
        totals.set(name,row);
      }
    } catch {}
    el('weakTopics').replaceChildren();
    const weak=[...totals].filter(([,record])=>record.correct<record.independent)
      .sort((a,b)=>(b[1].independent-b[1].correct)-(a[1].independent-a[1].correct));
    for(const [name,record] of weak){
      const item=document.createElement('li');item.textContent=name+' · '+(record.independent-record.correct)+' independent misses';
      el('weakTopics').append(item);
    }
    if(!weak.length){const item=document.createElement('li');item.textContent='No independent misses recorded.';el('weakTopics').append(item);}
    el('masteryRows').replaceChildren();
    if (!totals.size) {
      const row=el('masteryRows').insertRow(), cell=row.insertCell();
      cell.colSpan=3;cell.textContent='Complete a practice activity to see your results.';
    }
    for (const [name,record] of totals) {
      const row=el('masteryRows').insertRow();
      for (const value of [name,record.correct+' / '+record.independent,record.assisted]) row.insertCell().textContent=value;
    }
  }

  function artifact() {
    const canvas=el('phantom'),ctx=canvas.getContext('2d'),n=canvas.width;
    const frame=ctx.createImageData(n,n), amount=Number(el('severity').value)/100;
    const type=el('artifactType').value, vertical=el('artifactAxis').value==='vertical';
    function signal(x,y) {
      const fat=((x-95)/77)**2+((y-97)/70)**2<1;
      const tissue=((x-94)/66)**2+((y-100)/59)**2<1;
      const fluid=((x-109)/21)**2+((y-90)/13)**2<1;
      return {fat:fat&&!tissue?140:0, water:fluid?210:tissue?80:0};
    }
    const shift=Math.round(amount*21), repeat=Math.round(n*(1-amount*.57));
    for (let y=0;y<n;y++) for (let x=0;x<n;x++) {
      const base=signal(x,y), sample=(delta)=>signal(x-(vertical?0:delta),y-(vertical?delta:0));
      let v=base.fat+base.water;
      if (type==='ghost') {
        const ghost=sample(32);v+=amount*.45*(ghost.fat+ghost.water);
      } else if (type==='shift') v=base.water+sample(shift).fat;
      else {
        const folded=sample((vertical?y:x)<n/2?-repeat:repeat);
        v+=folded.fat+folded.water;
      }
      const i=(y*n+x)*4;
      frame.data[i]=frame.data[i+1]=frame.data[i+2]=Math.min(255,v);frame.data[i+3]=255;
    }
    ctx.putImageData(frame,0,0);
    el('artifactText').textContent={
      ghost:'Motion can produce replicas in the phase-encoding direction. This model adds a displaced copy.',
      wrap:'An undersized phase FOV can fold signal from outside the prescribed image back into the image.',
      shift:'Fat and water can map to different positions along the frequency-encoding direction.'
    }[type];
  }
  for (const id of ['severity','artifactType','artifactAxis']) el(id).oninput=artifact;
  updateSystems();const requested=new URLSearchParams(location.search).get('section');show(Object.hasOwn(sections,requested)?requested:'systems');
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
