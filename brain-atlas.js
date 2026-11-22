import { platePractice } from './atlas-plate-practice.js';
import { layerCatalog } from './atlas-layers.js';
import { anatomyReference, atlasContext, discReference } from './brain-reference.js';
const { parse, verifyAtlasGrid, voxelIndex } = Nifti;

const el = id => document.getElementById(id);
const status = text => { el('status').textContent = text; };
const packs = {
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
const pack = packs[region], spine = region === 'spine';
const {id:packId,cache:cacheName,path:manifestURL} = pack;
if (pack.title) {
  document.title = pack.title + ' | MRI Study Lab';
  el('atlasTitle').textContent = pack.title;
  el('intro').textContent = pack.intro;
  el('status').textContent = 'Download the MRI and labels once to use them offline.';
  el('brainAttribution').hidden = true;
  el(region+'Attribution').hidden = false;
}
el(region+'Nav').hidden = true;
const views = [
  { name: 'Axial', axis: 2, u: 0, v: 1, edges: 'APLR' },
  { name: 'Coronal', axis: 1, u: 0, v: 2, edges: 'SILR' },
  { name: 'Sagittal', axis: 0, u: 1, v: 2, edges: 'SIPA' }
];
let image, mask, labels, anchors, cursor;
let hintOn = false, hintUsed = false;
let selected = 0, target = 0, activeView = views[0], drawing = false;

let layers, enabled = new Set(), isolated = 0, mode = 'mri', panning = false, timeout;
const preferenceKey = 'mri.atlas.layers.' + packId;
const tones = Object.create(null);
const setPracticePlate=platePractice(el,drawPlate);
const plates = {brain:['brainstem','brain-cross'],spine:['cervical',null],knee:['knee','knee-cross'],cardiac:['heart','heart-cross']};

function updatePlate() {
  const [illustrated,cross] = plates[region];
  const name = labels?.[selected]?.name;
  const sectionMatch=region==='brain'&&/Caudate|Putamen|Pallidum|Lateral Ventricle/.test(name??'');
  const match=region==='brain'&&name?.endsWith('Thalamus')?'diencephalon':sectionMatch?cross:illustrated;
  const key=mode==='cross'?cross:mode==='compare'?match:illustrated;
  setPracticePlate(key);drawPlate(key);
}

function drawPlate(key) {
  const plate = AnatomyPlates[key];
  const picture=el('plateImage'), caption=el('plateCaption');
  picture.hidden=!plate;
  caption.replaceChildren();
  if (!plate) {
    picture.removeAttribute('src');
    caption.textContent='A licensed cross-sectional plate is unavailable for this region. Real MRI includes orthogonal slices.';
    return;
  }
  picture.src=plate.asset;picture.alt=plate.title;
  const source=document.createElement('a');
  source.href=plate.source;source.textContent=plate.title;
  const license=document.createElement('a');
  license.href=plate.licenseUrl;license.textContent=plate.license;
  caption.append(source,' · '+plate.author+' · ',license);
  if(plate.changes)caption.append('. '+plate.changes);
}

function setMode(next) {
  mode=next;
  const mri=mode==='mri'||mode==='compare';
  if(!mri&&target)endPractice();
  el('mriPanel').hidden=!mri;
  el('atlasPlate').hidden=mode==='mri';
  el('atlasLayout').classList.toggle('compare',mode==='compare');
  el('explorePanel').hidden=!image||!mri;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  if(mode!=='mri')updatePlate();else setPracticePlate(null);
}
for(const button of document.querySelectorAll('[data-mode]')) button.onclick=()=>setMode(button.dataset.mode);

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
const noteKey = id => 'mri.scan.note.' + packId + '.' + id;
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
      const i = index(q), id = mask.p[i], offset = (y*w+x)*4;
      const gray = Math.max(0,Math.min(255,(image.p[i]-lower)*255/width));
      frame.data[offset] = gray;
      frame.data[offset+1] = gray;
      frame.data[offset+2] = gray;
      frame.data[offset+3] = 255;
      if (target && hintOn && id === target && !spine) {
        frame.data[offset]=gray*.35+255*.65;frame.data[offset+1]=gray*.35+210*.65;frame.data[offset+2]=gray*.35+65*.65;
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
  if (target && hintOn && spine && anchors[target]?.[axis] === cursor[axis]) {
    const pt=anchors[target];ctx.strokeStyle='#ffd15f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pt[u]+.5,h-pt[v]-.5,5,0,2*Math.PI);ctx.stroke();
  }
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
  view.slider.value = cursor[axis];
  view.title.textContent = view.name + ' · ' + (cursor[axis]+1) + ' / ' + image.dim[axis];
}

function render() {
  el('isolate').disabled=!selected||!!target;
  el('isolate').setAttribute('aria-pressed',String(!!isolated));
  el('practiceSelected').hidden=!selected||!!target||!visibleLabel(selected);
  el('practiceHint').hidden = !target;
  el('practiceHint').setAttribute('aria-pressed',String(hintOn && !!target));
  el('practiceHint').textContent = hintOn && target ? 'Hide location hint' : 'Show location hint';
  views.forEach(drawView);
  el('undo').disabled = !strokes(activeView).length;
  el('position').textContent = pack.coordinates+' (mm) ' + cursor.map((voxel, axis) =>
    (image.affine[axis*5]*voxel + image.affine[axis*4+3]).toFixed(1)).join(', ');
}

function select(id) {
  selected = id;
  if(mode==='compare')updatePlate();
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
  if (labels[id]) {
    try { el('notes').value = localStorage.getItem(noteKey(id)) ?? ''; }
    catch { el('notes').value = ''; }
  }
}

function normalized(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return [(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height]
    .map(n => Math.max(0,Math.min(.999999,n)));
}

function tap(view, event) {
  const [x,y] = normalized(view.canvas,event);
  cursor[view.u] = Math.floor(x*view.canvas.width);
  cursor[view.v] = view.canvas.height-1-Math.floor(y*view.canvas.height);
  let id = mask.p[index(cursor)];
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
    const correct = id === target;
    el('feedback').textContent = correct ? 'Correct. You found ' + labels[target].name + (hintUsed ? ' with a hint.' : ' independently.') : 'Try again. Find ' + labels[target].name + '.';
    recordPractice(target, correct, hintUsed);
    if (correct) { clearTimeout(timeout);el('timeLeft').textContent='';target = 0;hintOn = false;el('cancelPractice').hidden = true;select(id);updateResults(); }
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
    history.unshift({ topic:packId + ':' + id, ok:correct && !assisted, assisted, correct, date:new Date().toISOString() });
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
  canvas.style.aspectRatio = (canvas.width * image.affine[view.u*5]) + ' / ' + (canvas.height * image.affine[view.v*5]);
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

function updateResults() {
  const query = el('search').value.trim().toLowerCase();
  el('results').replaceChildren();
  if ((!query && region==='brain') || target) return;
  for (const [id,label] of Object.entries(labels)) {
    if (!label.name.toLowerCase().includes(query) || !anchors[id] || !visibleLabel(Number(id))) continue;
    const button = document.createElement('button');
    button.textContent = label.name + (label.subdivision ? ' · ' + label.subdivision + ' subdivision' : '');
    button.onclick = () => { cursor = [...anchors[id]];select(Number(id));render(); };
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
    verifyAtlasGrid(t1,segmentation);
    image = t1;mask = segmentation;labels = manifest.labels;anchors = manifest.anchors;
    cursor = pack.anchor ? [...anchors[pack.anchor]] : image.dim.map(n => Math.floor(n/2));
    let offline = false;
    if (cache) {
      try {
        for (const item of volumes) await cache.put(item.path,item.file);
        await cache.put(manifestURL,response);offline = true;
      } catch { await caches.delete(cacheName).catch(() => {}); }
    }
    initLayers();
    const lookup=new URLSearchParams(location.search).get('structure');
    const match=Object.entries(labels).find(([,label])=>label.name===lookup||
      (label.subdivision&&label.subdivision+' '+label.name===lookup));
    if(match&&anchors[match[0]]) {
      const id=Number(match[0]);
      cursor=[...anchors[id]];select(id);
    }
    el('views').replaceChildren();
    views.forEach(addView);
    el('workspace').hidden = false;el('load').hidden = true;el('remove').hidden = !offline;
    status(offline ? 'Atlas ready. MRI and labels saved for offline use.' : 'Atlas ready for this session. Browser storage could not save an offline copy.');
    setMode(mode);updateResults();render();
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
  startPractice(candidates[Math.floor(Math.random()*candidates.length)]);
};
function startPractice(id) {
  clearTimeout(timeout);
  el('cancelPractice').hidden = false;
  hintOn = false;hintUsed = false;
  target=id;
  selected = 0;el('notesPanel').hidden = true;el('reference').replaceChildren();
  el('structure').textContent = 'Identification practice';
  el('details').textContent = 'Find the named structure in the MRI.';
  el('feedback').textContent = 'Find ' + labels[target].name + '.';
  const seconds=Number(el('timer').value), deadline=Date.now()+seconds*1000;
  el('timeLeft').textContent='';
  if (seconds) {
    function tick() {
      const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));
      el('timeLeft').textContent=left?left+' s':'';
      if(left){timeout=setTimeout(tick,250);return;}
      const name=labels[target].name;
      recordPractice(target,false,hintUsed);endPractice();
      el('feedback').textContent='Time expired · '+name+'.';
    }
    tick();
  }
  updateResults();render();
}
function endPractice() {
  clearTimeout(timeout);el('timeLeft').textContent='';
  target=0;hintOn=false;el('cancelPractice').hidden=true;el('feedback').textContent='';
  const id=mask.p[index(cursor)];
  select(visibleLabel(id)?id:0);updateResults();render();
}
el('practiceSelected').onclick=()=>{if(selected&&visibleLabel(selected))startPractice(selected);};
el('cancelPractice').onclick=endPractice;
el('practiceHint').onclick = () => {
  if (!target) return;
  hintOn = !hintOn;
  if (hintOn) { hintUsed = true; if (anchors[target]) cursor = [...anchors[target]]; }
  el('feedback').textContent = 'Find ' + labels[target].name + '. This attempt counts as assisted recall.';
  render();
};
el('ink').onclick = () => {
  drawing = !drawing;el('ink').setAttribute('aria-pressed',drawing);
  if(drawing&&panning)el('pan').click();
};
el('inkSelected').onclick=()=>{
  if(!drawing)el('ink').click();
  el('views').scrollIntoView({block:'start'});
};
el('undo').onclick = () => {
  const current = strokes(activeView);current.pop();
  try { localStorage.setItem(drawingKey(activeView),JSON.stringify(current));render(); }
  catch { status('Could not save the drawing change.'); }
};
el('save').onclick = () => {
  try {
    localStorage.setItem(noteKey(selected),el('notes').value);
    el('feedback').textContent = 'Structure notes saved.';
  } catch { el('feedback').textContent = 'Notes could not be saved. Browser storage may be full.'; }
};
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(console.warn);
open(false);
