import { createQuizPanel } from './anatomy-quiz-ui.js';
import { platePractice } from './atlas-plate-practice.js';
import { layerCatalog } from './atlas-layers.js';
import { anatomyReference, atlasContext, discReference } from './brain-reference.js';
const { parse, verifyAtlasGrid, voxelIndex } = Nifti;

const el = id => document.getElementById(id);
const status = text => { el('status').textContent = text; };
const packs = {
  ...AtlasCoverage.packs,
  brain:{id:'cerebra1',cache:'mri-brain-atlas-cerebra-1',path:'atlas/manifest.json',
    coordinates:'MNI RAS',label:'CerebrA label'},
  spine:{id:'spine1',cache:'mri-spine-atlas-1',path:'atlas/spine/manifest.json',
    title:'Cervical Spine Atlas',intro:'Explore 12 point landmarks on a 3D T1 MRI of the cervical and upper thoracic spine.',
    coordinates:'Scanner RAS',label:'Spine Generic point landmark',anchor:5},
  knee:{id:'knee1',cache:'mri-knee-atlas-1',path:'atlas/knee/manifest.json',
    title:'Knee MRI Atlas',intro:'Explore the femur and articular cartilage on a preprocessed 3D DESS reference scan.',
    coordinates:'Standardized RAS',label:'pyKNEEr label',anchor:2},
  cardiac:{id:'cardiac1',cache:'mri-cardiac-atlas-1',path:'atlas/cardiac/manifest.json',
    title:'Cardiac MRI Atlas',intro:'Explore the left atrium on a 3D cardiac MRI reference from the Medical Segmentation Decathlon.',
    coordinates:'Dataset RAS',label:'MSD left atrial mask',anchor:1}
};
const requested = new URLSearchParams(location.search).get('region');
const region = Object.hasOwn(packs,requested) ? requested : 'brain';
if(new URLSearchParams(location.search).get('from')==='study')AppNavigation.active('practice');
const pack = packs[region], spine = region === 'spine';
const {id:packId,cache:cacheName,path:manifestURL} = pack;
if (pack.title) {
  document.title = pack.title + ' | MRI Study Lab';
  el('atlasTitle').textContent = pack.title;
  el('intro').textContent = pack.intro;
  el('status').textContent = 'Download the MRI and labels once to use them offline.';
  el('brainAttribution').hidden = true;
  const oldCredit=el(region+'Attribution');
  if(oldCredit)oldCredit.hidden=false;
  AppNavigation.context(pack.title);
}
for(const [key,value] of Object.entries(AtlasCoverage.packs))el('atlasRegion').add(new Option(value.title,key));
el('atlasRegion').value=region;
const extra=Object.hasOwn(AtlasCoverage.packs,region);
if(extra){
  el('load').textContent='Download and open MRI';
  document.querySelector('.quiz-options').hidden=true;
  if(pack.preview){el('datasetPreview').src=pack.preview;el('datasetPreview').hidden=false;}
  for(const control of document.querySelectorAll('[data-mode]')){
    if(control.dataset.mode!=='mri')control.hidden=true;
  }
}
el('atlasRegion').onchange=()=>{
  const next=el('atlasRegion').value, params=new URLSearchParams({region:next});
  if(mode!=='mri')params.set('mode',mode);
  AppNavigation.open('./brain-atlas.html?'+params);
};
const views = [
  { name: 'Axial', axis: 2, u: 0, v: 1, edges: 'APLR' },
  { name: 'Coronal', axis: 1, u: 0, v: 2, edges: 'SILR' },
  { name: 'Sagittal', axis: 0, u: 1, v: 2, edges: 'SIPA' }
];
let image, mask, labels, anchors, cursor;
let hintOn = false, hintUsed = false, hintLevel=0, hintsHidden=false;
let selected = 0, target = 0, activeView = views[0], drawing = false;

let layers, enabled = new Set(), isolated = 0, mode = 'mri', panning = false, timeout;
const preferenceKey = 'mri.atlas.layers.' + packId;
const tones = Object.create(null);
const quizUI=createQuizPanel(el);
const setPracticePlate=platePractice(el,quizUI,drawPlate,active=>{
  el('mriPanel').hidden=active||mode==='illustrated'||mode==='cross';
  el('explorePanel').hidden=active||!image;
  el('atlasLayout').classList.toggle('compare',!active&&mode==='compare');
},message=>{el('studyMessage').textContent=message;});
let round=[],roundIndex=0,locked=false,priorView,hintCursor=null;
let quizScore={correct:0,assisted:0}, quizDeadline=0, quizResult=null, lastPick=null;
const quizKey='mri.atlas.session.v1:'+packId;
function persistQuiz(){
  if(!target)return;
  const value={version:1,round,roundIndex,locked,priorView,hintCursor,quizScore,hintLevel,hintsHidden,cursor,quizDeadline,quizResult,lastPick,zoom:el('zoom').value,offsets:views.map(view=>view.offset)};
  try{localStorage.setItem(quizKey,JSON.stringify(value));}catch{}
  StudyResume.save('Anatomy Explorer','MRI identification',pack.title??'Brain MRI','Question '+(roundIndex+1)+' of '+round.length,
    './brain-atlas.html?region='+region+'&resumeQuiz=1'+(new URLSearchParams(location.search).has('anatomyCorrection')?'&anatomyCorrection=1':''));
}
window.addEventListener('pagehide',persistQuiz);
function restoreQuiz(){
  if(!['resumeQuiz','anatomyCorrection'].some(key=>new URLSearchParams(location.search).has(key)))return;
  let saved;
  try{saved=JSON.parse(localStorage.getItem(quizKey));}catch{return;}
  if(saved?.version!==1||!Array.isArray(saved.round)||!saved.round.every(id=>anchors[id])||!saved.round[saved.roundIndex])return;
  ({round,roundIndex,priorView,quizScore,cursor}=saved);
  el('zoom').value=saved.zoom;
  views.forEach((view,i)=>{view.offset=saved.offsets[i];applyTransform(view);});
  el('atlasPlate').hidden=true;
  el('atlasLayout').classList.remove('compare');
  showQuestion(saved);routeAnatomyCorrection();
}

const plates = {brain:['brainstem','brain-cross'],spine:['cervical',null],knee:['knee','knee-cross'],cardiac:['heart','heart-cross']};

function updatePlate() {
  const [illustrated,cross] = plates[region]??[];
  const name = labels?.[selected]?.name;
  const sectionMatch=region==='brain'&&/Caudate|Putamen|Pallidum|Lateral Ventricle/.test(name??'');
  const thalamus=region==='brain'&&name?.endsWith('Thalamus');
  const match=thalamus?'diencephalon':sectionMatch?cross:illustrated;
  const key=mode==='cross'?(thalamus?'diencephalon':cross):match;
  if(!setPracticePlate(key))drawPlate(key);
}

function drawPlate(key, question=false) {
  const plate = question ? QuizAssets[key] : AnatomyPlates[key];
  let picture=el('plateImage');
  if(question){
    const blank=document.createElement('img');blank.id=picture.id;
    picture.replaceWith(blank);picture=blank;
  }
  const caption=el('plateCaption');
  picture.hidden=!plate;
  caption.replaceChildren();
  if (!plate) {
    picture.removeAttribute('src');
    caption.textContent='A licensed cross-sectional plate is unavailable for this region. Real MRI includes orthogonal slices.';
    return;
  }
  picture.src=plate.asset;picture.alt=question?'Unlabeled anatomy illustration':plate.title;
  if(question)return;
  const source=document.createElement('a');
  source.href=plate.source;source.textContent=plate.title;
  const license=document.createElement('a');
  license.href=plate.licenseUrl;license.textContent=plate.license;
  caption.append(source,' · '+plate.author+' · ',license);
  if(plate.changes)caption.append('. '+plate.changes);
}

function setMode(next) {
  mode=extra?'mri':next;
  const mri=mode==='mri'||mode==='compare';
  if(!mri&&target)endPractice();
  el('mriPanel').hidden=!mri;
  el('atlasPlate').hidden=mode==='mri';
  el('atlasLayout').classList.toggle('compare',mode==='compare');
  el('explorePanel').hidden=!image;
  el('practice').hidden=extra||!image||!mri;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  if(mode!=='mri')updatePlate();else setPracticePlate(null);
}
for(const button of document.querySelectorAll('[data-mode]')) button.onclick=()=>{
  if(target||button.dataset.mode===mode)return;
  const route=new URL(location.href);
  route.searchParams.set('mode',button.dataset.mode);
  AppNavigation.navigate(route);
  setMode(button.dataset.mode);
};
window.addEventListener('popstate',()=>{
  const previous=new URLSearchParams(location.search).get('mode')??'mri';
  if(!target&&['mri','illustrated','cross','compare'].includes(previous)&&previous!==mode)setMode(previous);
});
el('focusView').onclick=()=>{
  const active=document.body.classList.toggle('focused');
  el('focusView').setAttribute('aria-pressed',String(active));
  el('focusView').textContent=active?'Exit full-screen view':'Full-screen view';
  if(active){el('downloads').open=false;el('layerDrawer').open=false;el('structureDrawer').open=false;}
};


function visibleLabel(id) {
  return !!id && enabled.has(layers.mappings[id]) && (!isolated||id===isolated);
}
function refreshLayerControls() {
  const query=el('layerSearch').value.trim().toLowerCase();
  const list=el('layers');list.replaceChildren();
  for(const group of layers.groups) {
    if (!group.name.toLowerCase().includes(query))continue;
    const label=document.createElement('label'), input=document.createElement('input'), swatch=document.createElement('span');
    input.type='checkbox';input.checked=enabled.has(group.id);input.disabled=!group.available;
    swatch.className='swatch';swatch.style.backgroundColor=group.color;
    input.onchange=()=>{ if(input.checked)enabled.add(group.id);else enabled.delete(group.id);isolated=0;updateLayers(); };
    label.append(input,swatch,group.name+(group.available?'':' · unavailable'));list.append(label);
  }
  el('layerStatus').textContent=isolated?'Isolated · '+labels[isolated].name:enabled.size+' layers enabled. Additional categories require verified labels for this pack.';
}
function initLayers() {
  layers=layerCatalog(region,labels);
  const all=layers.groups.filter(group=>group.available);
  for (const {id,color} of all) tones[id]=color.slice(1).match(/../g).map(n=>parseInt(n,16));
  let saved;
  try {saved=JSON.parse(localStorage.getItem(preferenceKey));} catch {}
  enabled=new Set(all.map(group=>group.id).filter(id=>!Array.isArray(saved?.enabled)||saved.enabled.includes(id)));
  if(Number.isFinite(saved?.opacity))el('opacity').value=saved.opacity;
  el('overlay').checked=saved?.overlay!==false;
  refreshLayerControls();
}

function saveLayerPreferences() {
  try { localStorage.setItem(preferenceKey,JSON.stringify({
    enabled:[...enabled],opacity:Number(el('opacity').value),overlay:el('overlay').checked
  })); } catch {status('Layer preferences could not be saved.');}
}

function updateLayers() {
  saveLayerPreferences();
  refreshLayerControls();updateResults();render();
}
for(const id of ['layersAll','layersReset','layersNone']) el(id).onclick=()=>{
  enabled=new Set(id==='layersNone'?[]:layers.groups.filter(group=>group.available).map(group=>group.id));
  isolated=0;
  el('overlay').checked=true;
  if(id==='layersReset')el('opacity').value=32;
  updateLayers();
};
el('layerSearch').oninput=refreshLayerControls;
el('isolate').onclick=()=>{
  if(!selected)return;
  isolated=isolated===selected?0:selected;
  if(isolated){enabled.add(layers.mappings[selected]);el('overlay').checked=true;}
  updateLayers();
};

function applyTransform(view) {
  const zoom=Number(el('zoom').value);
  const limit=(zoom-1)*50;
  view.offset=view.offset.map(value=>Math.max(-limit,Math.min(limit,value)));
  view.canvas.style.transform='translate('+view.offset[0]+'%, '+view.offset[1]+'%) scale('+zoom+')';
}
el('zoom').oninput=()=>views.forEach(applyTransform);
el('resetView').onclick=()=>{
  if(panning)el('pan').click();
  el('zoom').value=1;views.forEach(view=>{view.offset=[0,0];applyTransform(view);});
};
el('pan').onclick=()=>{
  panning=!panning;
  el('pan').setAttribute('aria-pressed',panning);
  if(panning&&drawing)el('ink').click();
};

const drawingKey = view => 'mri.atlas.drawing.' + packId + '.' + view.axis + '.' + cursor[view.axis];
const structureId = id => packId+':'+id;
const index = point => voxelIndex(image.dim, point);

function strokes(view) {
  try { return JSON.parse(localStorage.getItem(drawingKey(view)) ?? '[]'); }
  catch { return []; }
}

function drawView(view) {
  const { axis, u, v, canvas } = view;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const frame = ctx.createImageData(w,h);
  const range = image.hi - image.lo;
  const width = range * Number(el('width').value) / 100;
  const lower = image.lo + range * Number(el('center').value) / 100 - width / 2;
  const alpha = el('overlay').checked && !target ? Number(el('opacity').value) / 100 : 0;
  const q = cursor.slice();
  for (let y = 0; y < h; y++) {
    q[v] = h - 1 - y;
    for (let x = 0; x < w; x++) {
      q[u] = x;
      const i = index(q), id = mask?.p[i]??0, offset = (y*w+x)*4;
      const gray = Math.max(0,Math.min(255,(image.p[i]-lower)*255/width));
      frame.data[offset] = gray;
      frame.data[offset+1] = gray;
      frame.data[offset+2] = gray;
      frame.data[offset+3] = 255;
      if (target && (hintOn||locked) && id === target && !spine) {
        const tint=locked?[89,238,156]:[255,210,65];
        for(let c=0;c<3;c++)frame.data[offset+c]=gray*.35+tint[c]*.65;
      } else if (alpha && visibleLabel(id) && !spine) {
        const mix = id === selected ? Math.max(alpha, .65) : alpha;
        const tint = id === selected ? [255,210,95] : tones[layers.mappings[id]];
        for (let c = 0; c < 3; c++) frame.data[offset+c] = gray*(1-mix)+tint[c]*mix;
      }
    }
  }
  ctx.putImageData(frame,0,0);
  if (spine && alpha) {
    for (const [id,point] of Object.entries(anchors)) {
      if (point[axis] !== cursor[axis] || !visibleLabel(Number(id))) continue;
      const x = point[u]+.5, y = h-point[v]-.5;
      ctx.strokeStyle = Number(id) === selected ? '#ffd15f' : layers.groups.find(group=>group.id===layers.mappings[id]).color;
      ctx.globalAlpha = Math.min(1,alpha*3);
      ctx.lineWidth = 1;
      ctx.beginPath();ctx.arc(x,y,3,0,2*Math.PI);ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  if (target && (hintOn||locked) && spine && anchors[target]?.[axis] === cursor[axis]) {
    const pt=anchors[target];ctx.strokeStyle=locked?'#59ee9c':'#ffd15f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pt[u]+.5,h-pt[v]-.5,5,0,2*Math.PI);ctx.stroke();
  }
  if(!target){
  ctx.strokeStyle = '#72e5ce';
  ctx.lineWidth = .55;
  const x = cursor[u]+.5, y = h-cursor[v]-.5;
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  ctx.strokeStyle = '#ffcf72';ctx.fillStyle = '#ffcf72';ctx.lineWidth = 1.5;ctx.lineCap = 'round';
  for (const stroke of [...strokes(view), ...(view.stroke ? [view.stroke] : [])]) {
    const [[sx,sy]] = stroke;
    ctx.beginPath();ctx.arc(sx*w,sy*h,.75,0,2*Math.PI);ctx.fill();
    ctx.beginPath();ctx.moveTo(sx*w,sy*h);
    for (const [px,py] of stroke.slice(1)) ctx.lineTo(px*w,py*h);
    ctx.stroke();
  }
  }
  view.slider.value = cursor[axis];
  view.title.textContent = (pack.oblique?'Near-':'') + view.name + ' · ' + (cursor[axis]+1) + ' / ' + image.dim[axis];
}

function render() {
  el('isolate').disabled=!selected||!!target;
  el('isolate').setAttribute('aria-pressed',String(!!isolated));
  el('practiceSelected').hidden=extra||!selected||!!target||!visibleLabel(selected);
  views.forEach(drawView);
  el('undo').disabled = !strokes(activeView).length;
  el('position').textContent = pack.coordinates+' (mm) ' + cursor.map((_, axis) =>
    ([0,1,2].reduce((sum,column)=>sum+image.affine[axis*4+column]*cursor[column],image.affine[axis*4+3])).toFixed(1)).join(', ');
}

function select(id) {
  selected = id;
  if(mode!=='mri'&&!target)updatePlate();
  el('structure').textContent = labels[id]?.name ?? 'Unlabeled voxel';
  el('details').textContent = labels[id]
    ? (labels[id].hemisphere ? labels[id].hemisphere + ' hemisphere · ' : '') + pack.label + ' ' + id + (labels[id].subdivision ? ' · ' + labels[id].subdivision + ' subdivision' : '')
    : 'Choose a colored region or search for a structure.';
  const baseName = labels[id]?.name.replace(/^(Left|Right) /,'');
  const disc=spine&&baseName?.endsWith(' disc');
  const reference = disc?discReference:anatomyReference[baseName];
  const context=atlasContext[disc?'disc':baseName];
  const fields = el('reference');
  fields.replaceChildren();
  if (reference) {
    for (const [title, body] of [
      ['Location',reference.location],['Function',reference.function],
      ['Neighboring structures',context[0]],['MRI appearance',reference.imaging],
      ['Relevant sequences',context[1]],['Common pathology',context[2]],['Clinical significance',context[3]]
    ]) {
      const heading = document.createElement('dt');
      const detail = document.createElement('dd');
      heading.textContent = title;detail.textContent = body;
      fields.append(heading,detail);
    }
  }
  el('notesPanel').hidden = !labels[id];
  el('inkSelected').hidden=!labels[id];
  el('bookmark').hidden=!labels[id];
  if (labels[id]) {
    try { el('notes').value=AtlasStudy.readNote(structureId(id));updateBookmark(); }
    catch { el('notes').value = ''; }
  }
}

function normalized(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return [(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height]
    .map(n => Math.max(0,Math.min(.999999,n)));
}

function tap(view, event) {
  if(target&&locked)return;
  const [x,y] = normalized(view.canvas,event);
  cursor[view.u] = Math.floor(x*view.canvas.width);
  cursor[view.v] = view.canvas.height-1-Math.floor(y*view.canvas.height);
  let id = mask?.p[index(cursor)]??0;
  if (spine) {
    let distance = 7;
    for (const [candidate,point] of Object.entries(anchors)) {
      if (point[view.axis] !== cursor[view.axis]) continue;
      const gap = Math.hypot(point[view.u]-cursor[view.u],point[view.v]-cursor[view.v]);
      if (gap < distance) { id = Number(candidate);distance = gap; }
    }
    if (id) cursor = [...anchors[id]];
  }
  if (target) {
    const correct=id===target;lastPick=id;
    recordPractice(target,correct,hintUsed);
    if(!correct&&el('retry').checked){
      quizUI.feedback('Incorrect. Try another location.','incorrect');
      render();return;
    }
    finishQuestion(correct);
  } else {
    el('feedback').textContent = '';
    if (id && !visibleLabel(id)) id=0;
    if (id !== selected) select(id);
  }
  render();
}

function recordPractice(id, correct, assisted = false) {
  try {
    const key = 'mri-study-lab-review-v1';
    const history = JSON.parse(localStorage.getItem(key) ?? '[]');
    history.unshift({ topic:packId + ':' + id, ok:correct && !assisted, assisted, hintLevel, correct, date:new Date().toISOString() });
    localStorage.setItem(key,JSON.stringify(history));
  } catch { status('This practice response could not be saved.'); }
}

function changeSlice(view, value) {
  activeView = view;
  cursor[view.axis] = Math.max(0,Math.min(image.dim[view.axis]-1,value));
  render();
}

function addView(view) {
  const section = document.createElement('section');
  section.innerHTML = '<h2></h2><div class="image"><canvas></canvas><div aria-hidden="true" class="markers"></div></div><label>Slice <input type="range" min="0" value="0"></label>';
  el('views').append(section);
  const canvas = view.canvas = section.querySelector('canvas');
  view.offset=[0,0];
  canvas.width = image.dim[view.u];canvas.height = image.dim[view.v];
  const spacing = axis=>Math.hypot(...[0,1,2].map(row=>image.affine[row*4+axis]));
  canvas.style.aspectRatio = (canvas.width * spacing(view.u)) + ' / ' + (canvas.height * spacing(view.v));
  canvas.setAttribute('aria-label', view.name + ' MRI slice');
  canvas.setAttribute('role','img');
  section.querySelector('.markers').innerHTML = [...view.edges].map((letter,i) =>
    '<span class="' + ['top','bottom','left','right'][i] + '">' + letter + '</span>').join('');
  view.title = section.querySelector('h2');
  view.slider = section.querySelector('input');view.slider.max = image.dim[view.axis]-1;
  view.slider.setAttribute('aria-label',view.name + ' slice');
  view.slider.oninput = () => changeSlice(view, Number(view.slider.value));
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    if (!view.stroke && event.deltaY) changeSlice(view,cursor[view.axis]+Math.sign(event.deltaY));
  }, { passive:false });
  canvas.onpointerdown = event => {
    if (!event.isPrimary) return;
    activeView = view;
    if (panning && event.pointerType!=='pen') {
      view.pan={id:event.pointerId,x:event.clientX,y:event.clientY,offset:[...view.offset]};
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if ((!drawing && event.pointerType !== 'pen') || target) return tap(view,event);
    view.stroke = [normalized(canvas,event)];
    view.pointer = event.pointerId;
    view.strokeKey = drawingKey(view);
    canvas.setPointerCapture(event.pointerId);drawView(view);
  };
  canvas.onpointermove = event => {
    if (view.pan?.id===event.pointerId) {
      const rect=canvas.parentElement.getBoundingClientRect();
      view.offset=[view.pan.offset[0]+100*(event.clientX-view.pan.x)/rect.width,
        view.pan.offset[1]+100*(event.clientY-view.pan.y)/rect.height];
      applyTransform(view);return;
    }
    if (!view.stroke || event.pointerId !== view.pointer) return;
    view.stroke.push(normalized(canvas,event));drawView(view);
  };
  canvas.onpointerup = event => {
    if(view.pan?.id===event.pointerId){view.pan=null;return;}
    if (!view.stroke || event.pointerId !== view.pointer) return;
    try {
      const previous = JSON.parse(localStorage.getItem(view.strokeKey) ?? '[]');
      localStorage.setItem(view.strokeKey,JSON.stringify([...previous,view.stroke]));
    } catch { status('This stroke could not be saved. Browser storage may be full.'); }
    view.stroke = null;render();
  };
  canvas.onpointercancel = () => { view.pan=null;view.stroke = null;render(); };
}

let previousStructureRoute;
function structureRoute(){
  const params=new URLSearchParams(location.search);
  return [params.get('label'),params.get('structure')].join(':');
}
function routeStructure(clear=true) {
  if(!image||target)return;
  const state=structureRoute();
  if(clear&&state===previousStructureRoute)return;
  previousStructureRoute=state;
  const params=new URLSearchParams(location.search), lookup=params.get('structure'), label=params.get('label');
  const match=labels[label]?[label,labels[label]]:Object.entries(labels).find(([,entry])=>entry.name===lookup||
    (entry.subdivision&&entry.subdivision+' '+entry.name===lookup));
  if(match&&anchors[match[0]]){
    const id=Number(match[0]);cursor=[...anchors[id]];select(id);
  }else if(clear)select(0);
}
window.addEventListener('popstate',()=>{routeStructure();if(image)render();});

function updateResults() {
  const query = el('search').value.trim().toLowerCase();
  el('results').replaceChildren();
  if ((!query && region==='brain') || target) return;
  for (const [id,label] of Object.entries(labels)) {
    if (!label.name.toLowerCase().includes(query) || !anchors[id] || !visibleLabel(Number(id))) continue;
    const button = document.createElement('button');
    button.textContent = label.name + (label.subdivision ? ' · ' + label.subdivision + ' subdivision' : '');
    button.onclick = () => {
      const url=new URL(location.href);url.searchParams.delete('structure');url.searchParams.set('label',id);
      AppNavigation.navigate(url);
      routeStructure(false);render();
    };
    el('results').append(button);
  }
  if (!el('results').children.length) el('results').textContent = 'No matching structures.';
}

async function bytes(response, asset, offline) {
  const name = asset.title;
  if (!response.ok) throw Error('Could not download ' + name + ' (HTTP ' + response.status + ').');
  if (offline || !response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const data = new Uint8Array(asset.bytes);
  let loaded = 0, shown = -1;
  try {
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      if (value.length > data.length-loaded) throw Error('Unexpected size for ' + name + '.');
      data.set(value,loaded);loaded += value.length;
      const percent = Math.floor(loaded/data.length*100);
      if (percent >= shown+5 || percent === 100) {
        shown = percent;status('Downloading ' + name + ' · ' + percent + '%');
      }
    }
  } finally { await reader.cancel(); }
  if (loaded !== data.length) throw Error('Incomplete atlas download. Try again online.');
  return data.buffer;
}

function showDataset(manifest){
  const information=el('datasetDetails');
  information.hidden=false;
  const source=document.createElement('a');source.href=manifest.source;
  source.textContent=manifest.attribution;
  const license=document.createElement('a');license.href=manifest.licenseUrl;license.textContent=manifest.license;
  information.replaceChildren(manifest.sequence+' · '+manifest.orientation+' ',source,' · ',license,
    manifest.labelsNote?' · '+manifest.labelsNote:'');
  if(region==='mra'){
    const mip=document.createElement('a');mip.href='./real-scans.html?scan=mra';mip.textContent='View maximum-intensity projection';
    information.append(' · ',mip);
  }
  el('status').textContent='Download '+(manifest.volumes.reduce((n,v)=>n+v.bytes,0)/1000000).toFixed(1)+' MB to use this acquisition offline.';
}
async function showDownloadEstimate(){
  if(!extra)return;
  try{
    const cache=await caches.open(cacheName);
    const response=await cache.match(manifestURL)??await fetch(manifestURL);
    if(response.ok&&!image)showDataset(await response.json());
  }catch{}
}
async function open(online) {
  el('load').disabled = true;
  try {
    const cache = await caches.open(cacheName).catch(() => null);
    const saved = await cache?.match(manifestURL);
    if (!saved && !online) return;
    status('Reading atlas manifest…');
    const response = saved ?? await fetch(manifestURL);
    if (!response.ok) throw Error('Atlas manifest unavailable.');
    const manifest = await response.clone().json();
    const volumes = [];
    for (const asset of manifest.volumes) {
      status((saved ? 'Reading ' : 'Downloading ') + asset.title + '…');
      const file = (saved && await cache.match(asset.path)) || await fetch(asset.path);
      const buffer = await bytes(file,asset,saved);
      if (buffer.byteLength !== asset.bytes) throw Error('Incomplete atlas download. Try again online.');
      const digest = await crypto.subtle.digest('SHA-256',buffer);
      const checksum = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2,'0')).join('');
      if (checksum !== asset.sha256) throw Error('Atlas file failed its integrity check.');
      volumes.push({ path:asset.path, file:new Response(buffer), volume:await parse(buffer) });
    }
    const [t1, segmentation] = volumes.map(item => item.volume);
    if(!segmentation&&region!=='mra')throw Error('This atlas requires its source label volume.');
    verifyAtlasGrid(t1,segmentation,{oblique:pack.oblique});
    image = t1;mask = segmentation;labels = manifest.labels;anchors = manifest.anchors;
    cursor = pack.anchor ? [...anchors[pack.anchor]] : image.dim.map(n => Math.floor(n/2));
    let offline = false;
    if (cache) {
      try {
        for (const item of volumes) await cache.put(item.path,item.file);
        await cache.put(manifestURL,response);offline = true;
      } catch { await caches.delete(cacheName).catch(() => {}); }
    }
    if(extra){
      showDataset(manifest);el('datasetPreview').hidden=true;el('layerDrawer').hidden=!mask;
      for(const control of ['opacity','overlay'])el(control).closest('label').hidden=!mask;
    }
    initLayers();
    routeStructure(false);
    el('views').replaceChildren();
    views.forEach(addView);
    el('workspace').hidden = false;el('load').hidden = true;el('remove').hidden = !offline;
    status(offline ? (mask?'Atlas ready. MRI and labels saved for offline use.':'Atlas ready. MRI saved for offline use.') : 'Atlas ready for this session. Browser storage could not save an offline copy.');
    el('downloads').open=new URLSearchParams(location.search).get('panel')==='downloads';
    setMode(mode);updateResults();render();if(!extra)restoreQuiz();
  } catch(error) { status(error.message); }
  finally { el('load').disabled = false; }
}

el('load').onclick = () => open(true);
el('remove').onclick = async () => {
  try {
    await caches.delete(cacheName);
    el('remove').hidden = true;el('load').hidden = false;
    status('Offline atlas removed. The current session stays open.');
  } catch { status('Could not remove the offline atlas.'); }
};
for (const id of ['width','center']) el(id).oninput = render;
for (const id of ['opacity','overlay']) el(id).oninput=()=>{saveLayerPreferences();render();};
el('search').oninput = updateResults;
el('practice').onclick = () => {
  const visible = new Set();
  for (const { axis,u,v } of views) {
    const q = cursor.slice();
    for (let y=0;y<image.dim[v];y++) for (let x=0;x<image.dim[u];x++) {
      q[axis]=cursor[axis]; q[u]=x;q[v]=y;
      const id = mask.p[index(q)];
      if (labels[id]&&visibleLabel(id)) visible.add(id);
    }
  }
  const candidates=el('scope').value==='layers'
    ? Object.keys(anchors).map(Number).filter(visibleLabel) : [...visible];
  if (!candidates.length) {
    el('feedback').textContent='Enable a layer containing labels and choose a slice or switch practice scope.';
    return;
  }
  const pool=[...candidates], questions=[];
  while(pool.length&&questions.length<5)questions.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  beginQuiz(questions);
};
function beginQuiz(ids,returnMode=mode) {
  const route=new URL(location.href);route.searchParams.set('resumeQuiz','1');
  AppNavigation.navigate(route,true);
  priorView={mode:returnMode,selected,cursor:[...cursor],zoom:el('zoom').value,offsets:views.map(view=>[...view.offset])};
  round=ids;roundIndex=0;quizScore={correct:0,assisted:0};
  el('studyMessage').textContent='';
  el('explorePanel').hidden=true;el('atlasPlate').hidden=true;
  el('atlasLayout').classList.remove('compare');
  showQuestion();
}
function showQuestion(saved) {
  clearTimeout(timeout);
  target=round[roundIndex];locked=Boolean(saved?.locked);
  hintLevel=saved?.hintLevel??0;hintsHidden=Boolean(saved?.hintsHidden);
  hintOn=hintLevel===3&&!hintsHidden&&!locked;hintUsed=hintLevel>0;hintCursor=saved?.hintCursor??null;
  quizResult=saved?.quizResult??null;lastPick=saved?.lastPick??null;
  el('explorePanel').hidden=true;
  quizUI.show({name:labels[target].name,number:roundIndex+1,total:round.length,
    next:nextQuestion,exit:endPractice,hint:()=>toggleHint(false),hideHint:()=>toggleHint(true),teach:openAnatomyCorrection,details:()=>{
      select(target);el('explorePanel').hidden=false;el('structureDrawer').open=true;
    }});
  const seconds=Number(el('timer').value);
  quizDeadline=saved?.quizDeadline??(seconds?Date.now()+seconds*1000:0);
  if(hintLevel)quizUI.hints(anatomyHints(),hintLevel,hintsHidden);
  if(locked&&quizResult)quizUI.result(quizResult.message,quizResult.tone);
  if(quizDeadline&&!locked) {
    function tick() {
      const left=Math.max(0,Math.ceil((quizDeadline-Date.now())/1000));
      quizUI.time(left?left+' s':'');
      if(left){timeout=setTimeout(tick,250);return;}
      recordPractice(target,false,hintUsed);
      finishQuestion(false,'Time expired. The target is marked.');
    }
    tick();
  }
  render();persistQuiz();
}
function finishQuestion(correct,message) {
  clearTimeout(timeout);quizUI.time('');
  locked=true;hintOn=false;
  if(anchors[target])cursor=[...anchors[target]];
  quizScore.correct+=Number(correct&&!hintUsed);quizScore.assisted+=Number(hintUsed);
  resetViewportForTarget();
  quizResult={message:message??(correct?(hintUsed?'Correct with a hint (Hint '+hintLevel+').':'Correct. Independent recall.'):'Incorrect. The target is marked.'),tone:correct?'correct':'incorrect'};
  quizUI.result(quizResult.message,quizResult.tone);
  render();persistQuiz();
}
function nextQuestion() {
  if(new URLSearchParams(location.search).has('anatomyCorrection'))AppNavigation.navigate(anatomyUrl(false),true,{mriAnatomyCorrection:false});
  if(++roundIndex<round.length){showQuestion();return;}
  el('studyMessage').textContent='Quiz complete · '+quizScore.correct+' of '+round.length+
    ' correct without a hint · '+quizScore.assisted+' assisted.';
  endPractice();
}
function endPractice() {
  clearTimeout(timeout);
  target=0;hintOn=false;locked=false;
  try{localStorage.removeItem(quizKey);}catch{}
  if(StudyResume.read()?.href?.includes('region='+region+'&'))StudyResume.clear('Anatomy Explorer');
  quizUI.close();
  const route=anatomyUrl(false);route.searchParams.delete('resumeQuiz');
  AppNavigation.navigate(route,true,{mriAnatomyCorrection:false});
  cursor=priorView.cursor;el('zoom').value=priorView.zoom;
  views.forEach((view,i)=>{view.offset=priorView.offsets[i];applyTransform(view);});
  select(priorView.selected);setMode(priorView.mode);updateResults();render();
}
function resetViewportForTarget() {
  el('zoom').value=1;
  views.forEach(view=>{view.offset=[0,0];applyTransform(view);});
}
function anatomyUrl(open){
  const url=new URL(location.href);
  if(open)url.searchParams.set('anatomyCorrection','1');
  else url.searchParams.delete('anatomyCorrection');
  return url;
}
function openAnatomyCorrection(){
  if(!locked||quizResult?.tone!=='incorrect')return;
  AppNavigation.navigate(anatomyUrl(true),false,{mriAnatomyCorrection:true});
  routeAnatomyCorrection();
}
function routeAnatomyCorrection(){
  const host=el('atlasCorrection');
  const open=locked&&quizResult?.tone==='incorrect'&&new URLSearchParams(location.search).has('anatomyCorrection');
  host.hidden=!open;
  if(!open)return;
  const name=labels[target].name;
  const base=name.replace(/^(Left|Right) /,'');
  const reference=spine&&base.endsWith(' disc')?discReference:anatomyReference[base];
  const picked=labels[lastPick]?.name??'Unlabeled location';
  const locationNote=reference?.location??anatomyHints()[1];
  StudyGuidance.correction(host,{
    id:packId+'-'+target,topic:name,stem:'Locate '+name+'.',type:'single',key:[0],
    options:[[name,locationNote],[picked,'This location falls outside the verified target. Compare the highlighted target with the neighboring anatomy.']],
    related:'./brain-atlas.html?region='+region+'&label='+target
  },lastPick===null?[]:[1],{back:()=>{
    if(history.state?.mriAnatomyCorrection)history.back();
    else {AppNavigation.navigate(anatomyUrl(false),true,{mriAnatomyCorrection:false});routeAnatomyCorrection();}
  }});
  persistQuiz();
}
window.addEventListener('popstate',routeAnatomyCorrection);
function anatomyHints(){
  const name=labels[target].name;
  let cues;
  if(region==='spine')cues=['Orient yourself on the sagittal view using the vertebral bodies and the spinal canal.',
    /disc/i.test(name)?'Count intervertebral spaces from the C2–C3 disc below the axis or from the junction between C7 and T1.':'Use the skull base and the upper cervical vertebrae as landmarks.'];
  else if(region==='knee')cues=['Find the tibiofemoral joint between the distal thigh and proximal lower leg.',
    /cartilage/i.test(name)?'Look for the thin articular lining between the bone and the joint space.':'Look above the tibial plateau at the distal bone that forms the upper side of the joint.'];
  else if(region==='cardiac')cues=['Orient the heart using the ventricles and posterior mediastinum.',
    'Identify the upper cardiac chamber that receives pulmonary venous blood, behind the left ventricle.'];
  else if(/ventricle|caudate|thalamus|putamen|pallidum|internal capsule/i.test(name))cues=[
    'Locate the deep central structures using the midline and the ventricular system.',
    'Distinguish deep gray matter, white matter and ventricular spaces on the adjacent orthogonal view.'];
  else if(/cerebell|brain stem|pons|medulla|vermis|brainstem/i.test(name))cues=[
    'Orient the posterior fossa below the tentorium.',
    'Distinguish the anterior brainstem from the cerebellar tissue posterior to the fourth ventricle.'];
  else if(/hippocamp|amygdala/i.test(name))cues=['Locate the medial temporal lobe on a coronal view.',
    'Use the temporal horn as a landmark and compare the anterior and posterior medial temporal structures.'];
  else cues=['Find the midsagittal midline first and orient the anterior and posterior sides of the brain.',
    'Cross-check the target’s named subdivision across the axial, coronal and sagittal views before choosing.'];
  return [...cues,'The source-verified target is highlighted on its matching slice.'];
}
function toggleHint(hide){
  if(hide)hintsHidden=!hintsHidden;
  else {hintLevel=Math.min(3,hintLevel+1);hintsHidden=false;}
  hintUsed=hintLevel>0;
  const visual=hintLevel===3&&!hintsHidden;
  if(visual&&!hintOn){
    hintCursor=[...cursor];if(anchors[target])cursor=[...anchors[target]];
    resetViewportForTarget();
  } else if(!visual&&hintOn&&hintCursor)cursor=hintCursor;
  hintOn=visual;
  quizUI.hints(anatomyHints(),hintLevel,hintsHidden);render();persistQuiz();
}
el('practiceSelected').onclick=()=>{
  if(!selected||!visibleLabel(selected))return;
  const returnMode=mode;
  if(mode!=='mri'&&mode!=='compare')setMode('mri');
  beginQuiz([selected],returnMode);
};
el('ink').onclick = () => {
  drawing = !drawing;el('ink').setAttribute('aria-pressed',drawing);
  if(drawing&&panning)el('pan').click();
};
el('inkSelected').onclick=()=>{
  if(mode==='illustrated'||mode==='cross')setMode('mri');
  if(!drawing)el('ink').click();
  el('views').scrollIntoView({block:'start'});
};
el('undo').onclick = () => {
  const current = strokes(activeView);current.pop();
  try { localStorage.setItem(drawingKey(activeView),JSON.stringify(current));render(); }
  catch { status('Could not save the drawing change.'); }
};
function updateBookmark() {
  const saved=AtlasStudy.isBookmarked(structureId(selected));
  el('bookmark').setAttribute('aria-pressed',String(saved));
  el('bookmark').textContent=saved?'Remove bookmark':'Bookmark structure';
}
el('bookmark').onclick=()=>{
  try { AtlasStudy.toggleBookmark(structureId(selected),labels[selected].name);updateBookmark(); }
  catch { el('feedback').textContent='Bookmark storage is unavailable.'; }
};
el('save').onclick = () => {
  try {
    AtlasStudy.saveNote(structureId(selected),el('notes').value);
    el('feedback').textContent = 'Structure notes saved.';
  } catch { el('feedback').textContent = 'Notes could not be saved. Browser storage may be full.'; }
};
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(console.warn);
const viewMode=new URLSearchParams(location.search).get('mode');
if(['mri','illustrated','cross','compare'].includes(viewMode))setMode(viewMode);
if(new URLSearchParams(location.search).has('practice'))document.querySelector('.quiz-options').open=true;
open(false).then(showDownloadEstimate);
