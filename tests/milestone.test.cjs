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
  for (const page of ['index.html','real-scans.html']) {
    assert.match(fs.readFileSync(page,'utf8'), /href="\.\/brain-atlas\.html"/);
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
