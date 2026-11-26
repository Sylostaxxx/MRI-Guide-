(() => {
  const el=id=>document.getElementById(id);
  const {regions,protocols,sources}=LowerExtremity;
  const control=el('libraryRegion');
  LowerExtremity.fill(control);
  control.remove(0);
  const plateIds={hip:['femur','quadriceps'],thigh:['quadriceps'],knee:['knee']};
  const node=(tag,text)=>{const result=document.createElement(tag);if(text)result.textContent=text;return result;};
  const link=(text,url)=>{const result=node('a',text);result.href=url;return result;};
  const countRow=Object.fromEntries(StudyCoverage.rows.map(row=>[row[0],row]));
  const names={hip:'Hip',thigh:'Thigh',knee:'Knee',leg:'Lower leg',ankle:'Ankle',foot:'Foot'};
  const anatomyRefs=el('lowerAnatomy');
  const cards=el('lowerProtocols');
  function render() {
    const region=control.value;
    const row=regions[region];
    if(!row)return;
    const [, , , , , visual,text]=countRow[names[region]];
    el('lowerStatus').textContent=row.coverage+' '+(text+visual)+' of '+row.target+' planned questions · '+visual+' use real MRI.';
    const tools=el('lowerActions');
    tools.replaceChildren(link('Continuous practice','./practice.html?region='+region),link('Custom quiz or short timed test','./registry.html?region='+region),
      link('Missed questions','./practice.html?view=trouble&region='+region));
    if(row.atlas)tools.append(link('Open real MRI and layers','./brain-atlas.html?region='+row.atlas),
      link('Plan on real knee localizers','./?section=clinical&tool=planner&region=knee'));
    anatomyRefs.replaceChildren();
    for(const [title,text] of row.anatomy)anatomyRefs.append(node('dt',title),node('dd',text));
    const figures=el('lowerPlates');figures.replaceChildren();
    for(const id of plateIds[region]??[]){
      const plate=AnatomyPlates[id];
      const figure=node('figure');const img=node('img');img.src=plate.asset;img.alt=plate.title;img.loading='lazy';
      const caption=node('figcaption');caption.append(plate.title+' · ',link(plate.author,plate.source),' · ',link(plate.license,plate.licenseUrl));
      figure.append(img,caption);figures.append(figure);
    }
    cards.replaceChildren();
    for(const [,name,position,landmark,sequences,sampling,pitfall,source] of protocols.filter(protocol=>protocol[0]===region)){
      const details=node('details');details.append(node('summary',name));
      const list=node('dl');
      for(const [label,value] of [['Position and coil',position],['Localizer, landmarks and planes',landmark],['Routine and optional sequences',sequences],
        ['Slice sampling and FOV',sampling],['Motion, phase direction and artifacts',pitfall]])list.append(node('dt',label),node('dd',value));
      details.append(list,link(...sources[source]));cards.append(details);
    }
    const noteKey='mri.lower.reference.note.v1:'+region;
    const note=el('lowerNote');
    note.value='';
    el('lowerNoteStatus').textContent='';
    el('saveLowerNote').onclick=()=>{
      if(!note.value.trim())return;
      try{StudyStore.note(noteKey, row.label+' · '+note.value.trim());note.value='';el('lowerNoteStatus').textContent='Saved to Notes and bookmarks in Settings.';}
      catch{el('lowerNoteStatus').textContent='The note could not be saved.';}
    };
  }
  const table=el('coverageRows');
  for(const row of StudyCoverage.rows){
    const tr=node('tr');
    row.forEach((cell,i)=>tr.append(node(i?'td':'th',String(cell))));
    table.append(tr);
  }
  control.onchange=()=>{
    const next=new URL(location.href);
    next.searchParams.set('section','lower');
    next.searchParams.set('region',control.value);
    AppNavigation.navigate(next);render();
  };
  function route(){
    const region=new URLSearchParams(location.search).get('region');
    control.value=Object.hasOwn(regions,region)?region:'knee';render();
  }
  route();
  window.addEventListener('popstate',route);
})();
