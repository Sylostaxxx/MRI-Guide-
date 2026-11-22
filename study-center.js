(() => {
  const el=id=>document.getElementById(id), {systems,cases}=StudyContent;
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
    for (const key of ['systems','artifact','activity','mastery']) el(key).hidden=key!==(cases[course]?'activity':course);
    for (const node of el('sections').children) node.setAttribute('aria-current',String(node.dataset.section===section));
    if (section==='artifact') artifact();
    if (section==='mastery') mastery();
    if (cases[section]) exercise();
  }
  for (const [key,name] of Object.entries(sections)) {
    const control=button(name,()=>show(key));control.dataset.section=key;el('sections').append(control);
  }

  for (const [index,[name]] of systems.entries()) el('system').add(new Option(name,index));
  function organ() {
    const [,name,location,role,pathology,diagram,mri]=systems[Number(el('system').value)];
    el('structure').textContent=name;el('location').textContent=location;
    el('function').textContent=role;el('pathologyText').textContent=pathology;
    el('organ').setAttribute('d',diagram);el('diagram').setAttribute('aria-label',name+' schematic');
    el('mri').replaceChildren();
    if (mri) {
      const link=document.createElement('a');
      link.href='./brain-atlas.html'+(mri==='brain'?'':'?region='+mri);
      link.textContent='Explore the real '+mri+' MRI atlas';
      el('mri').append(link);
    } else el('mri').textContent='This structure has a schematic illustration.';
    el('organStatus').textContent='';
    try { el('organNote').value=localStorage.getItem('mri.scan.note.system.'+el('system').value)??''; }
    catch { el('organNote').value='';el('organStatus').textContent='Browser storage unavailable.'; }
  }
  el('system').onchange=organ;
  el('organSave').onclick=()=>{
    try {
      localStorage.setItem('mri.scan.note.system.'+el('system').value,el('organNote').value);
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
    const totals=new Map();
    try {
      for (const attempt of read()) {
        const [family,id]=attempt.topic.split(':');
        const name=family==='training'?(sections[id]??'Training'):({
          cerebra:'Brain atlas',cerebra1:'Brain atlas',spine1:'Spine atlas',knee1:'Knee atlas',cardiac1:'Cardiac atlas'
        }[family]??'Pre-study quiz');
        const row=totals.get(name)??{independent:0,correct:0,assisted:0};
        if (attempt.assisted) row.assisted++;
        else { row.independent++;row.correct+=Number(attempt.ok); }
        totals.set(name,row);
      }
    } catch {}
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
  organ();const requested=new URLSearchParams(location.search).get('section');show(Object.hasOwn(sections,requested)?requested:'systems');
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
