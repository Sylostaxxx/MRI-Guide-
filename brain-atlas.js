import { anatomyReference } from './brain-reference.js';
const { parse, verifyAtlasGrid, voxelIndex } = Nifti;

const el = id => document.getElementById(id);
const status = text => { el('status').textContent = text; };
const region = new URLSearchParams(location.search).get('region');
const spine = region === 'spine';
const knee = region === 'knee';
const packId = spine ? 'spine1' : knee ? 'knee1' : 'cerebra1';
const cacheName = spine ? 'mri-spine-atlas-1' : knee ? 'mri-knee-atlas-1' : 'mri-brain-atlas-cerebra-1';
const manifestURL = spine ? './atlas/spine/manifest.json' : knee ? './atlas/knee/manifest.json' : './atlas/manifest.json';
if (spine || knee) {
  const title = spine ? 'Cervical Spine Atlas' : 'Knee MRI Atlas';
  document.title = title + ' | MRI Study Lab';
  el('atlasTitle').textContent = title;
  el('intro').textContent = spine
    ? 'Explore 12 point landmarks on a 3D T1 MRI of the cervical and upper thoracic spine.'
    : 'Explore the femur and articular cartilage on a preprocessed 3D DESS reference scan.';
  el('status').textContent = 'Download the MRI and labels once to use them offline.';
  el('brainAttribution').hidden = true;
  el(spine ? 'spineAttribution' : 'kneeAttribution').hidden = false;
}
el(spine ? 'spineNav' : knee ? 'kneeNav' : 'brainNav').hidden = true;
const views = [
  { name: 'Axial', axis: 2, u: 0, v: 1, edges: 'APLR' },
  { name: 'Coronal', axis: 1, u: 0, v: 2, edges: 'SILR' },
  { name: 'Sagittal', axis: 0, u: 1, v: 2, edges: 'SIPA' }
];
let image, mask, labels, anchors, cursor;
let selected = 0, target = 0, activeView = views[0], drawing = false;

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
      if (id && alpha) {
        const mix = id === selected ? Math.max(alpha, .65) : alpha;
        const tint = id === selected ? [255,210,95] : [70+(id*31)%144,115+(id*17)%115,105+(id*41)%150];
        for (let c = 0; c < 3; c++) frame.data[offset+c] = gray*(1-mix)+tint[c]*mix;
      }
    }
  }
  ctx.putImageData(frame,0,0);
  if (spine && alpha) {
    for (const [id,point] of Object.entries(anchors)) {
      if (point[axis] !== cursor[axis]) continue;
      const x = point[u]+.5, y = h-point[v]-.5;
      ctx.strokeStyle = Number(id) === selected ? '#ffd15f' : '#83e8d0';
      ctx.globalAlpha = Math.min(1,alpha*3);
      ctx.lineWidth = 1;
      ctx.beginPath();ctx.arc(x,y,3,0,2*Math.PI);ctx.stroke();
      ctx.globalAlpha = 1;
    }
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
  views.forEach(drawView);
  el('undo').disabled = !strokes(activeView).length;
  el('position').textContent = (spine ? 'Scanner RAS (mm) ' : knee ? 'Standardized RAS (mm) ' : 'MNI RAS (mm) ') + cursor.map((voxel, axis) =>
    (image.affine[axis*5]*voxel + image.affine[axis*4+3]).toFixed(1)).join(', ');
}

function select(id) {
  selected = id;
  el('structure').textContent = labels[id]?.name ?? 'Unlabeled voxel';
  el('details').textContent = labels[id]
    ? (labels[id].hemisphere ? labels[id].hemisphere + ' hemisphere · ' : '') + (spine ? 'Spine Generic point landmark ' : knee ? 'pyKNEEr label ' : 'CerebrA label ') + id + (labels[id].subdivision ? ' · ' + labels[id].subdivision + ' subdivision' : '')
    : 'Choose a colored region or search for a structure.';
  const baseName = labels[id]?.name.replace(/^(Left|Right) /,'');
  const reference = anatomyReference[baseName];
  const fields = el('reference');
  fields.replaceChildren();
  if (reference) {
    for (const [title, body] of [
      ['Location and neighbors',reference.location],['Function',reference.function],
      ['MRI appearance, sequences and clinical context',reference.imaging]
    ]) {
      const heading = document.createElement('dt');
      const detail = document.createElement('dd');
      heading.textContent = title;detail.textContent = body;
      fields.append(heading,detail);
    }
  }
  el('notesPanel').hidden = !labels[id];
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
    el('feedback').textContent = correct ? 'Correct. You found ' + labels[target].name + '.' : 'Try again. Find ' + labels[target].name + '.';
    recordPractice(target, correct);
    if (correct) { target = 0;el('cancelPractice').hidden = true;select(id);updateResults(); }
  } else {
    el('feedback').textContent = '';
    if (id !== selected) select(id);
  }
  render();
}

function recordPractice(id, correct) {
  try {
    const key = 'mri-study-lab-review-v1';
    const history = JSON.parse(localStorage.getItem(key) ?? '[]');
    history.unshift({ topic:packId + ':' + id, ok:correct, date:new Date().toISOString() });
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
    if ((!drawing && event.pointerType !== 'pen') || target) return tap(view,event);
    view.stroke = [normalized(canvas,event)];
    view.pointer = event.pointerId;
    view.strokeKey = drawingKey(view);
    canvas.setPointerCapture(event.pointerId);drawView(view);
  };
  canvas.onpointermove = event => {
    if (!view.stroke || event.pointerId !== view.pointer) return;
    view.stroke.push(normalized(canvas,event));drawView(view);
  };
  canvas.onpointerup = event => {
    if (!view.stroke || event.pointerId !== view.pointer) return;
    try {
      const previous = JSON.parse(localStorage.getItem(view.strokeKey) ?? '[]');
      localStorage.setItem(view.strokeKey,JSON.stringify([...previous,view.stroke]));
    } catch { status('This stroke could not be saved. Browser storage may be full.'); }
    view.stroke = null;render();
  };
  canvas.onpointercancel = () => { view.stroke = null;render(); };
}

function updateResults() {
  const query = el('search').value.trim().toLowerCase();
  el('results').replaceChildren();
  if ((!query && !spine && !knee) || target) return;
  for (const [id,label] of Object.entries(labels)) {
    if (!label.name.toLowerCase().includes(query) || !anchors[id]) continue;
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
    cursor = spine ? [...anchors[5]] : knee ? [...anchors[2]] : image.dim.map(n => Math.floor(n/2));
    let offline = false;
    if (cache) {
      try {
        for (const item of volumes) await cache.put(item.path,item.file);
        await cache.put(manifestURL,response);offline = true;
      } catch { await caches.delete(cacheName).catch(() => {}); }
    }
    el('views').replaceChildren();
    views.forEach(addView);
    el('workspace').hidden = false;el('load').hidden = true;el('remove').hidden = !offline;
    status(offline ? 'Atlas ready. MRI and labels saved for offline use.' : 'Atlas ready for this session. Browser storage could not save an offline copy.');
    updateResults();render();
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
for (const id of ['opacity','width','center','overlay']) el(id).oninput = render;
el('search').oninput = updateResults;
el('practice').onclick = () => {
  const visible = new Set();
  for (const { axis,u,v } of views) {
    const q = cursor.slice();
    for (let y=0;y<image.dim[v];y++) for (let x=0;x<image.dim[u];x++) {
      q[axis]=cursor[axis]; q[u]=x;q[v]=y;
      const id = mask.p[index(q)];
      if (labels[id]) visible.add(id);
    }
  }
  if (!visible.size) {el('feedback').textContent='Scroll to a slice containing brain anatomy first.';return;}
  const candidates = [...visible];
  el('cancelPractice').hidden = false;
  target = candidates[Math.floor(Math.random()*candidates.length)];
  selected = 0;el('notesPanel').hidden = true;el('reference').replaceChildren();el('structure').textContent = 'Identification practice';
  el('details').textContent = 'Find the named structure on one of the current views.';
  el('feedback').textContent = 'Find ' + labels[target].name + '.';
  updateResults();render();
};
el('cancelPractice').onclick = () => {
  target = 0;el('cancelPractice').hidden = true;el('feedback').textContent = '';
  select(mask.p[index(cursor)]);updateResults();render();
};
el('ink').onclick = () => {
  drawing = !drawing;el('ink').setAttribute('aria-pressed',drawing);
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
