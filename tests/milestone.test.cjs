const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');
require('../nifti.js');
const { parse, verifyAtlasGrid, voxelIndex } = Nifti;
require('../study-backup.js');

test('bundled T1 and segmentation match the published RAS grid and label table', async () => {
  const manifest = JSON.parse(fs.readFileSync('atlas/manifest.json'));
  const [image, segmentation] = await Promise.all(manifest.volumes.map(async asset => {
    const data = fs.readFileSync(asset.path);
    assert.equal(data.length, asset.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256);
    return parse(data);
  }));
  verifyAtlasGrid(image, segmentation);
  assert.deepEqual(image.dim, [193, 229, 193]);
  assert.deepEqual(image.affine, [1,0,0,-96, 0,1,0,-132, 0,0,1,-78]);
  assert.throws(() => verifyAtlasGrid(image,{...segmentation,affine:[...image.affine.slice(0,11),0]}), /grids/);
  assert.equal(Object.keys(manifest.labels).length,102);
  for (const [id, point] of Object.entries(manifest.anchors)) {
    assert.equal(segmentation.p[voxelIndex(image.dim,point)], Number(id));
    assert.ok(image.p[voxelIndex(image.dim,point)] > 0, 'anchor falls inside MRI signal');
  }
  assert.equal(manifest.labels[40].name,'Right Thalamus');
  assert.equal(manifest.labels[91].name,'Left Thalamus');
  assert.ok(manifest.anchors[40][0] > 96);
  assert.ok(manifest.anchors[91][0] < 96);
  await assert.rejects(parse(new Uint8Array(60)), /Incomplete/);
});

class MemoryStorage {
  data = new Map();
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index]; }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key,value) { this.data.set(key,value); }
  removeItem(key) { this.data.delete(key); }
}

test('legacy backups merge into notes, review, scan notes and drawings without replacing existing data', () => {
  const storage = new MemoryStorage();
  const note = {id:'a',region:'brain',body:'Original'};
  const attempt = {topic:'brain',ok:true,date:'2026-01-01T00:00:00.000Z'};
  StudyBackup.restore(storage,{version:1,notes:[note],history:[attempt]});
  StudyBackup.restore(storage,{'mri.scan.note.chris_t1':'White matter'});
  const imported = { notes:[{...note,body:'Edited elsewhere'}], history:[attempt],
    scanNotes:{'mri.scan.note.chris_t1':'Gray matter'},
    drawings:{'mri.atlas.drawing.cerebra1.0.10':[[[.25,.7]]]} };
  const merged = StudyBackup.restore(storage, imported);
  assert.equal(merged.notes.length,2);
  assert.equal(merged.history.length,1);
  assert.match(merged.scanNotes['mri.scan.note.chris_t1'],/White matter[\s\S]*Gray matter/);
  assert.deepEqual(StudyBackup.restore(storage, imported), merged);
  assert.throws(() => StudyBackup.restore(storage, {notes:[null]}), /Invalid notebook/);
});

test('restore rolls back when a storage write fails', () => {
  const storage = new MemoryStorage();
  StudyBackup.restore(storage,{notes:[{id:'old',region:'brain',body:'Keep this'}]});
  const before = new Map(storage.data);
  const write = storage.setItem.bind(storage);
  storage.setItem = (key,text) => { if (key.startsWith('mri.scan.note.')) throw Error('Quota');write(key,text); };
  assert.throws(() => StudyBackup.restore(storage,{notes:[{id:'new',region:'brain',body:'Restored'}],
    scanNotes:{'mri.scan.note.chris_t1':'Example'}}),/Quota/);
  assert.deepEqual(storage.data,before);
});

test('offline shell includes existing and new study navigation without precaching big volumes', () => {
  const sw = fs.readFileSync('sw.js','utf8');
  for (const page of ['index.html','brain-atlas.html','real-scans.html','study-backup.js','nifti.js','brain-atlas.js']) {
    assert.ok(sw.includes("'./" + page + "'"));
    assert.ok(fs.statSync(page).size > 0);
  }
  assert.doesNotMatch(sw,/\.nii\.gz/);
  assert.match(fs.readFileSync('index.html','utf8'), /href="\.\/brain-atlas\.html"/);
  for (const page of ['index.html','real-scans.html','brain-atlas.html','study-center.html']) {
    assert.match(fs.readFileSync(page,'utf8'), /src="\.\/app-navigation\.js"/);
  }
});

require('../mri-physics.js');

test('relaxation, ideal spin-echo signal and proton frequency obey expected limits', () => {
  const {longitudinalRecovery, transverseDecay, spinEchoSignal, larmorMHz} = MRIPhysics;
  assert.equal(longitudinalRecovery(0,850),0);
  assert.ok(Math.abs(longitudinalRecovery(850,850) - (1 - 1/Math.E)) < 1e-12);
  assert.equal(transverseDecay(75,75),1/Math.E);
  assert.ok(transverseDecay(20,45) < transverseDecay(20,75));
  assert.ok(spinEchoSignal(3000,25,850,75) > spinEchoSignal(500,25,850,75));
  assert.ok(spinEchoSignal(3000,100,850,75) < spinEchoSignal(3000,25,850,75));
  assert.ok(Math.abs(larmorMHz(3) - 127.73244) < 1e-10);
});

test('cervical T1 and manual landmarks align after canonical reorientation and crop', async () => {
  const manifest = JSON.parse(fs.readFileSync('atlas/spine/manifest.json'));
  const [image, labels] = await Promise.all(manifest.volumes.map(async asset => {
    const data = fs.readFileSync(asset.path);
    assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256);
    return parse(data);
  }));
  verifyAtlasGrid(image,labels);
  assert.deepEqual(image.dim,[76,132,222]);
  assert.equal(Object.keys(manifest.anchors).length,12);
  assert.equal(manifest.labels[3].name,'C2–C3 disc');
  assert.equal(manifest.labels[8].name,'C7–T1 disc');
  let previous = Infinity;
  for (const [id,point] of Object.entries(manifest.anchors)) {
    const i = voxelIndex(image.dim,point);
    assert.equal(labels.p[i],Number(id));
    assert.ok(image.p[i] > 0);
    assert.ok(point[2] < previous,'landmarks descend in the RAS+ superior axis');
    previous = point[2];
  }
});

test('knee DESS and both masks retain their aligned RAS grid after decimation', async () => {
  const manifest = JSON.parse(fs.readFileSync('atlas/knee/manifest.json'));
  const [image, labels] = await Promise.all(manifest.volumes.map(async asset => {
    const data = fs.readFileSync(asset.path);
    assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256);
    return parse(data);
  }));
  verifyAtlasGrid(image,labels);
  assert.deepEqual(image.dim,[160,192,192]);
  assert.ok(image.affine[0] < image.affine[5]);
  for (const [id,point] of Object.entries(manifest.anchors)) {
    const i = voxelIndex(image.dim,point);
    assert.equal(labels.p[i],Number(id));
    assert.ok(image.p[i] > 0);
  }
});

require('../planner-geometry.js');
test('physical prescription geometry handles gaps, FOV and oblique intersections', () => {
  const {stack,views,intersection,dot}=PlannerGeometry;
  const frame=stack('axial',0,3,4,1);
  assert.deepEqual(frame.positions,[-5,0,5]);
  assert.equal(frame.coverage,14);
  assert.deepEqual(intersection(views.sagittal,0,[0,0,0],frame,5,100),[[-50,5],[50,5]]);
  assert.deepEqual(intersection(views.sagittal,60,[0,0,0],frame,5,100),[]);
  assert.equal(intersection(views.axial,5,[0,0,0],frame,5,100).length,5);
  const oblique=stack('axial',30,5,3,1);
  assert.ok(Math.abs(dot(oblique.normal,oblique.along))<1e-10);
  const [[x,z]]=intersection(views.coronal,15,[0,0,0],oblique,8,100);
  assert.ok(Math.abs(dot(oblique.normal,[x,15,z])-8)<1e-9);
});

test('cropped cardiac MRI and left atrial mask keep the source voxel geometry', async () => {
  const manifest = JSON.parse(fs.readFileSync('atlas/cardiac/manifest.json'));
  const [image,labels] = await Promise.all(manifest.volumes.map(async asset=>{
    const data=fs.readFileSync(asset.path);
    assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
    return parse(data);
  }));
  verifyAtlasGrid(image,labels);
  assert.equal(image.affine[0],1.25);
  assert.equal(image.affine[5],1.25);
  assert.ok(Math.abs(image.affine[10]-1.37)<1e-5);
  const index=voxelIndex(image.dim,manifest.anchors[1]);
  assert.equal(labels.p[index],1);
  assert.ok(image.p[index]>0);
  assert.equal(labels.p.reduce((sum,value)=>sum+value,0),45003);
});

test('atlas layers use pack labels and keep unsupported categories unavailable', async () => {
  const { layerCatalog }=await import('../atlas-layers.js');
  for (const [region,path] of [
    ['brain','atlas/manifest.json'],['spine','atlas/spine/manifest.json'],
    ['knee','atlas/knee/manifest.json'],['cardiac','atlas/cardiac/manifest.json']
  ]) {
    const {labels}=JSON.parse(fs.readFileSync(path));
    const {mappings,groups}=layerCatalog(region,labels);
    assert.deepEqual(Object.keys(labels),Object.keys(mappings));
    assert.ok(Object.values(mappings).every(id=>groups.some(group=>group.id===id&&group.available)));
    assert.equal(groups.find(group=>group.id==='artery').available,false);
    if(region==='spine')assert.equal(groups.find(group=>group.id==='cord').available,false);
    if(region==='knee')assert.deepEqual(Object.values(mappings).sort(),['bone','cartilage']);
  }
});

test('system plates have verified file signatures, hashes and publisher attribution', () => {
  require('../study-content.js');
  require('../organ-catalog.js');
  require('../anatomy-plates.js');
  assert.equal(OrganCatalog.length,11);
  assert.equal(new Set(OrganCatalog.flatMap(group=>group.entries.map(entry=>entry.id))).size,22);
  for (const group of OrganCatalog) {
    for(const structure of group.entries)assert.ok(AnatomyPlates[structure.plate]);
  }
  for (const plate of Object.values(AnatomyPlates)) {
    const image=fs.readFileSync(plate.asset);
    assert.equal(image.subarray(8,12).toString(),'WEBP');
    assert.equal(createHash('sha256').update(image).digest('hex'),plate.sha256);
    assert.match(plate.source,/^https:\/\/openstax\.org\/books\//);
    assert.match(plate.licenseUrl,/^https:\/\/creativecommons\.org\/licenses\//);
  }
});

test('layer preferences round-trip while an existing per-pack setting takes precedence', () => {
  const original=new MemoryStorage();
  const key='mri.atlas.layers.knee1';
  const local={enabled:['bone'],opacity:34,overlay:true};
  const incoming={enabled:['cartilage'],opacity:18,overlay:false};
  original.setItem(key,JSON.stringify(local));
  assert.deepEqual(StudyBackup.validate(StudyBackup.read(original)).layers[key],local);
  StudyBackup.restore(original,{notes:[],layers:{[key]:incoming}});
  assert.deepEqual(JSON.parse(original.getItem(key)),local);
  const empty=new MemoryStorage();
  StudyBackup.restore(empty,{notes:[],layers:{[key]:incoming}});
  assert.deepEqual(JSON.parse(empty.getItem(key)),incoming);
});

test('identification assets use the verified unlabeled allowlist, separate from study plates', async () => {
  require('../quiz-assets.js');
  const {verifiedVariant,illustrationTargets}=await import('../atlas-plate-practice.js');
  assert.equal(verifiedVariant['brain-cross'],undefined);
  for(const target of new Set(Object.values(verifiedVariant))){
    const plate=QuizAssets[target];
    assert.ok(plate.asset.startsWith('./atlas/quiz/'));
    assert.match(plate.licenseUrl,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
    assert.equal(createHash('sha256').update(fs.readFileSync(plate.asset)).digest('hex'),plate.sha256);
    assert.ok(illustrationTargets[target].every(([,x,y])=>x>0&&x<1&&y>0&&y<1));
  }
});
