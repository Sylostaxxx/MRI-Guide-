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
  assert.match(sw, /atlas\/mra\/chris_MRA\.nii\.gz/);
  assert.ok(fs.statSync('atlas/mra/chris_MRA.nii.gz').size<100000);
  assert.doesNotMatch(sw.replace('./atlas/mra/chris_MRA.nii.gz',''),/\.nii\.gz/);
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
  assert.equal(verifiedVariant.cervical,undefined);
  assert.match(QuizAssets.brain.changes,/preserved all three anatomy layers/);
  for(const target of new Set(Object.values(verifiedVariant))){
    const plate=QuizAssets[target];
    assert.ok(plate.asset.startsWith('./atlas/quiz/'));
    assert.match(plate.licenseUrl,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
    assert.equal(createHash('sha256').update(fs.readFileSync(plate.asset)).digest('hex'),plate.sha256);
    assert.ok(illustrationTargets[target].every(([,x,y])=>x>0&&x<1&&y>0&&y<1));
  }
});

for (const name of ['blueprints','core','content','images','image-view','bank-physics','calculations','bank-acquisition','bank-procedures','bank-safety','bank-pilot']) {
  require('../registry-'+name+'.js');
}

test('registry bank has distinct keys, sourced rationales and an exact scored ARRT blueprint', () => {
  const { bank } = RegistryContent;
  const { arrt, armrit } = RegistryBlueprints;
  const ids = new Set();
  const stems = new Set();
  for (const q of bank) {
    assert.ok(!ids.has(q.id), q.id);
    ids.add(q.id);
    const signature = q.stem.toLowerCase().replace(/[^a-z0-9]/g,'')+'|'+(q.image ?? '');
    assert.ok(!stems.has(signature), q.id);
    stems.add(signature);
    assert.ok(arrt.categories[q.category] && q.objective && armrit.subjects.includes(q.armritSubject), q.id);
    assert.ok(q.references.every(([label,url])=>label && new URL(url).protocol==='https:'), q.id);
    assert.ok(q.options.every(([answer,why])=>answer && why), q.id);
    assert.equal(new Set(q.options.map(([answer])=>answer)).size,q.options.length,q.id);
    assert.ok(q.key.every(key=>Number.isInteger(key) && key>=0 && key<q.options.length),q.id);
    assert.equal(new Set(q.key).size,q.key.length,q.id);
    if (q.type==='multiple') assert.ok(q.key.length>1 && q.key.length<q.options.length,q.id);
    else assert.equal(q.key.length,q.type==='single'?1:q.options.length,q.id);
  }
  const form = RegistryCore.buildForm(bank,arrt);
  assert.equal(form.length,230);
  assert.equal(form.filter(item=>!item.scored).length,30);
  const counts = Object.fromEntries(Object.keys(arrt.categories).map(key=>[key,0]));
  const catalog = new Map(bank.map(q=>[q.id,q]));
  for (const item of form.filter(item=>item.scored)) counts[catalog.get(item.id).category]++;
  assert.deepEqual(Object.values(counts),[40,36,30,25,15,17,21,16]);
  for (const formId of ['B','C','D','E','random']) assert.equal(RegistryCore.buildForm(bank,arrt,formId),null);
  assert.deepEqual([armrit.total,armrit.minutes,armrit.formats],[225,210,['single']]);
});

test('registry calculation keys match independently checked displayed answers and image files match their manifests', () => {
  const expected = {p31:127.74,p32:1.5,p33:63.2,p34:13.5,p35:150,p36:42.58,p37:.30,p38:125000,
    p39:3,p40:12.5,s27:.859,s28:3.84,s29:2,s30:.50,s31:96,s32:173,s33:59,s34:2,s35:48,s36:5};
  const questions = RegistryContent.bank.filter(q=>q.formula);
  assert.equal(questions.length,Object.keys(expected).length);
  for (const q of questions) assert.equal(parseFloat(q.options[q.key[0]][0]),expected[q.id],q.id);
  const visual = RegistryContent.bank.filter(q=>q.image);
  assert.equal(visual.length,Object.keys(RegistryImages).length);
  for (const q of visual) {
    const asset = RegistryImages[q.image];
    assert.ok(asset?.license && asset.attribution && [0,1,2].includes(asset.axis),q.id);
    assert.equal(createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex'),asset.sha256,q.id);
  }
});

test('registry deadlines and pilot exclusions persist and backups retain completed sessions', () => {
  const { bank } = RegistryContent;
  const scored = bank.find(q=>q.type==='single' && !q.pilot);
  const pilot = bank.find(q=>q.pilot);
  const order = bank.find(q=>q.type==='order');
  const multiple = bank.find(q=>q.type==='multiple');
  assert.ok(RegistryCore.isCorrect(multiple,[...multiple.key].reverse()));
  assert.ok(!RegistryCore.isCorrect(order,[...order.key].reverse()));
  const storage = new MemoryStorage();
  const run = RegistryCore.makeRun({mode:'exam',title:'Exam',minutes:230,now:1000,
    items:[{question:scored,scored:true},{question:pilot,scored:false},{question:scored,scored:true}]});
  run.answers = {0:scored.key,1:pilot.key,2:scored.key};
  run.assisted = {2:true};
  RegistryCore.save(storage,{active:run,history:[]});
  assert.equal(RegistryCore.read(storage).active.deadline,1000+230*60000);
  const report = RegistryCore.report(run,2000);
  assert.deepEqual([report.correct,report.eligible,report.assisted,report.items[0].ms],[1,2,1,1000]);
  StudyBackup.restore(storage,{notes:[],registry:{active:null,history:[report],archive:{}}});
  StudyBackup.restore(storage,{notes:[]});
  assert.equal(RegistryCore.read(storage).active,null);
  assert.equal(StudyBackup.read(storage).registry.history[0].id,run.id);
});

require('../registry-bank-academy.js');
require('../study-content-map.js');
require('../study-review.js');
require('../study-store.js');
require('../physics-lessons.js');
require('../physics-videos.js');

test('academy content is complete for each published lesson and isolated from Exam A', () => {
  const bank=RegistryContent.bank;
  assert.equal(bank.filter(q=>!/^(le|seq|hand|bone|art|param|positioning|pathology|safety)-/.test(q.id)).length,279);
  assert.equal(bank.filter(q=>!q.pilot&&!/^(le|seq|hand|bone|art|param|positioning|pathology|safety)-/.test(q.id)).length,249);
  assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
  const exact = new Set();
  for(const q of bank){
    const key=q.stem.trim().toLowerCase().replace(/[^a-z0-9]/g,'')+'|'+(q.image??'');
    assert.ok(!exact.has(key),q.id);
    exact.add(key);
    assert.ok(q.blueprint&&q.subtopic&&q.version&&q.key.length&&q.references.length&&StudyContentMap.related(q),q.id);
    assert.equal(new Set(q.options.map(([choice])=>choice)).size,q.options.length,q.id);
    assert.ok(q.options.every(pair=>pair.length===2&&pair.every(Boolean)),q.id);
    assert.ok(q.key.every(i=>i>=0&&i<q.options.length),q.id);
  }
  const original=bank.filter(q=>!q.id.startsWith('v'));
  assert.deepEqual(RegistryCore.buildForm(bank,RegistryBlueprints.arrt),RegistryCore.buildForm(original,RegistryBlueprints.arrt));
  for (const lesson of PhysicsLessons.lessons) {
    for (const key of ['textbook','equation','simple','example','trap','takeaway']) assert.ok(lesson[key].length>35,key);
    const ids=StudyContentMap.lessons[lesson.id];
    assert.equal(new Set(ids).size,5,lesson.id);
    assert.ok(ids.every(id=>bank.some(q=>q.id===id&&StudyContentMap.lessonFor(q)===lesson.id)));
    assert.ok(PhysicsVideos[lesson.id].every(video=>/^https:\/\//.test(video.url)&&video.creator&&video.verified));
  }

});

test('review preserves mistakes, rejects assisted mastery, and counts independent success across days', () => {
  const {day,summarize,dashboard}=StudyReview;
  const now=new Date(2026,10,22,12).getTime();
  const attempt=(at,correct,hint=false)=>({question:'p01',at,correct,hint,subject:'Physics'});
  const attempts=[attempt(now,false),attempt(now+1,false),attempt(now+2,true,true),
    attempt(now+day,true),attempt(now+day+1,true),attempt(now+2*day,true),attempt(now+3*day,true)];
  let row=summarize(attempts.slice(0,2)).get('p01');
  assert.equal(row.due,now+1+4*3600000);
  row=summarize(attempts.slice(0,5)).get('p01');
  assert.deepEqual([row.misses,row.streak,row.mastered],[2,1,false]);
  row=summarize(attempts).get('p01');
  assert.deepEqual([row.misses,row.streak,row.mastered,row.due],[2,3,true,now+10*day]);
  row=summarize(attempts,now+4*day).get('p01');
  assert.deepEqual([row.misses,row.streak,row.mastered,row.due],[2,0,false,0]);
  const d=dashboard(attempts,now+3*day);
  assert.deepEqual([d.today,d.streak,d.total,d.topics.get('Physics').correct],[1,4,7,4]);
});

test('continuous review favors unseen, then due, without immediately repeating a question',()=>{
  const pool=['a','b','c'].map(id=>({id,topic:'k-space'}));
  const recent={recent:['a'],weak:false};
  const stats=new Map([['a',{due:0,misses:1,last:5,lastMiss:5}],['b',{due:50,misses:0,last:5,lastMiss:0}]]);
  assert.equal(StudyReview.select(pool,[],recent,stats,10,()=>0).id,'c');
  assert.equal(StudyReview.select(pool.slice(0,2),[],recent,stats,10,()=>0).id,'b');
  assert.equal(StudyReview.select(pool.slice(0,2),[],{recent:[]},stats,10,()=>0).id,'a');
  assert.equal(StudyReview.select(pool.slice(0,1),[],recent,stats,10,()=>0).id,'a');
});

test('continuous study backups reject invalid attempt and session schemas',()=>{
  const attempt={id:'session:1',question:'p01',version:'1',at:20,topic:'T1',subject:'Physics',
    session:'session',mode:'continuous',response:[0],correct:false,hint:false,ms:700};
  const payload={version:1,attempts:[attempt],records:[{id:'reset',value:{at:30},at:30}]};
  assert.equal(StudyStore.validate(payload),payload);
  assert.throws(()=>StudyStore.validate({...payload,version:99}),/backup/);
  assert.throws(()=>StudyStore.validate({...payload,attempts:[{...attempt,mode:'exam'}]}),/attempt/);
  assert.throws(()=>StudyStore.validate({...payload,records:[{id:'session',value:{},at:30}]}),/session/);
});

require('../study-variants.js');
test('generated Larmor variations have stable unique options and verified arithmetic',()=>{
  const expected=[42.58,85.16,170.32,298.06];
  assert.deepEqual(StudyVariants.variants.map(q=>parseFloat(q.options[q.key[0]][0])),expected);
  for (const q of StudyVariants.variants) {
    assert.equal(new Set(q.options.map(pair=>pair[0])).size,4);
    assert.equal(StudyContentMap.lessonFor(q),'larmor');
    assert.ok(!RegistryContent.bank.some(item=>item.id===q.id));
  }
});

require('../study-guidance.js');
test('calculation hints progress to the relationship without printing the keyed answer',()=>{
  const calculations=RegistryContent.bank.filter(q=>q.formula);
  assert.ok(calculations.length>0);
  for(const q of calculations){
    const tips=StudyGuidance.hints(q);
    assert.equal(tips.length,3,q.id);
    assert.equal(new Set(tips).size,3,q.id);
    assert.ok(tips.every(tip=>!tip.includes(q.options[q.key[0]][0])),q.id);
  }
  const question=RegistryContent.bank.find(item=>item.id==='p31');
  assert.ok(StudyGuidance.follow(question,RegistryContent.bank)?.exact);
});

require('../study-content.js');
test('each clinical study case has authored guidance for its exact distractors',()=>{
  for(const [mode,cases] of Object.entries(StudyContent.cases)){
    assert.equal(StudyContent.coaching[mode].length,cases.length);
    for(const [i,[,choices,correct]] of cases.entries()){
      const coaching=StudyContent.coaching[mode][i];
      assert.equal(coaching.why.length,choices.length);
      assert.ok(coaching.why.every((reason,index)=>index===correct||reason.length>15));
      const hints=StudyGuidance.hints({id:mode+i,topic:mode,hints:coaching.hints,key:[correct],
        options:choices.map(text=>[text,''])});
      assert.ok(hints.length>0);
      assert.ok(hints.every(hint=>!hint.includes(choices[correct])));
    }
  }
});

require('../lower-extremity.js');
require('../registry-bank-lower.js');
require('../study-coverage.js');
test('all new lower-extremity items have sourced answers, nonleaking hints and unchanged official forms',()=>{
  const bank=RegistryContent.bank;
  const all=bank.filter(q=>LowerExtremity.matches(q,'all'));
  assert.equal(all.length,71);
  assert.equal(all.filter(q=>q.image).length,7);
  assert.equal(all.filter(q=>q.id.startsWith('le-')).length,61);
  assert.deepEqual(RegistryCore.buildForm(bank,RegistryBlueprints.arrt),
    RegistryCore.buildForm(bank.filter(q=>!q.id.startsWith('le-')),RegistryBlueprints.arrt));
  const counts={'Hip':'hip','Thigh':'thigh','Knee':'knee','Lower leg':'leg','Ankle':'ankle','Foot':'foot'};
  for (const [name,region] of Object.entries(counts)) {
    const questions=all.filter(q=>LowerExtremity.matches(q,region));
    const row=StudyCoverage.rows.find(row=>row[0]===name);
    assert.equal(row[5],questions.filter(q=>q.image).length);
    assert.equal(row[6],questions.filter(q=>!q.image).length);
  }
  for(const q of all.filter(q=>q.id.startsWith('le-'))){
    assert.ok(q.studyOnly&&q.references.length&&q.related);
    assert.equal(q.options.length,4,q.id);
    assert.ok(q.options.every(([answer,why])=>answer&&why),q.id);
    assert.ok(StudyGuidance.hints(q).length>=2,q.id);
  }
});

test('registry image overlays match the original RAS source voxels, answer keys and verified checksums',async()=>{
  const packs={brain:'atlas/manifest.json',spine:'atlas/spine/manifest.json',knee:'atlas/knee/manifest.json',heart:'atlas/cardiac/manifest.json'};
  const grids={};
  for(const [region,path] of Object.entries(packs)){
    const manifest=JSON.parse(fs.readFileSync(path));
    const [volume,mask]=await Promise.all(manifest.volumes.map(entry=>parse(fs.readFileSync(entry.path))));
    verifyAtlasGrid(volume,mask);grids[region]={manifest,volume,mask};
  }
  const visual=RegistryContent.bank.filter(q=>q.image);
  assert.equal(visual.length,24);
  const comparison=RegistryImages['le-k-img02'];
  assert.equal(comparison.plane,'Coronal');
  assert.equal(RegistryImages[comparison.comparison].plane,'Axial');
  assert.deepEqual(RegistryImageView.disabled,[]);
  for(const q of visual){
    const asset=RegistryImages[q.image];
    const {manifest,mask}=grids[asset.region];
    const [u,v]=[0,1,2].filter(axis=>axis!==asset.axis);
    const dims=mask.dim;
    assert.ok(RegistryImageView.valid(q),q.id);
    assert.equal(asset.sequence,manifest.sequence,q.id);
    assert.equal(asset.labelName,manifest.labels[asset.label].name,q.id);
    assert.equal(mask.p[voxelIndex(dims,asset.voxel)],asset.label,q.id);
    assert.equal(createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex'),asset.sha256,q.id);
    if(asset.marker){
      assert.ok(Math.abs(asset.marker.target[0]-(asset.voxel[u]+.5)*asset.width/dims[u])<0.001,q.id);
      assert.ok(Math.abs(asset.marker.target[1]-(dims[v]-asset.voxel[v]-.5)*asset.height/dims[v])<0.001,q.id);
      assert.ok(!RegistryImageView.valid(q,{...asset,marker:{...asset.marker,target:[-1,0]}}),q.id);
      assert.ok(!RegistryImageView.valid(q,{...asset,marker:null}),q.id);
    }
    assert.ok(!RegistryImageView.valid(q,{...asset,verification:'pending'}),q.id);
  }
});

require('../study-focus.js');
require('../registry-bank-focus.js');
require('../body-browser.js');
test('focused topics exhaust their questions before cycling and preserve the exam form',()=>{
  const active=RegistryContent.bank.filter(q=>!q.pilot && StudyFocus.matches(q,'sequence'));
  assert.equal(active.length,47);
  const seen=[];
  while(seen.length<active.length) seen.push(StudyFocus.unvisited(active,seen,seen.at(-1))[0].id);
  assert.equal(new Set(seen).size,active.length);
  assert.ok(StudyFocus.unvisited(active,seen,seen.at(-1)).every(q=>q.id!==seen.at(-1)));
  const additions=RegistryContent.bank.filter(q=>/^(seq|hand|bone)-/.test(q.id));
  assert.equal(additions.length,24);
  assert.ok(additions.every(q=>q.studyOnly&&q.options.length>=3&&q.hints.length===2&&q.references.length));
  assert.deepEqual(RegistryCore.buildForm(RegistryContent.bank,RegistryBlueprints.arrt),
    RegistryCore.buildForm(RegistryContent.bank.filter(q=>!additions.includes(q)),RegistryBlueprints.arrt));
  const rows=BodyIndex.groups.flatMap(([,regions])=>regions);
  assert.equal(rows.length,32);
  assert.ok(rows.find(row=>row[0]==='hand'&&row[4]==='hand-bones'));
  assert.ok(rows.find(row=>row[0]==='long-bones'&&row[4]==='long-bone'));
});


require('../artifact-lessons.js');
require('../registry-bank-artifacts.js');
test('artifact curriculum maps to sourced practice and published physics lessons',()=>{
  const {lessons,displacement}=ArtifactAcademy;
  assert.equal(displacement(440,220),2);
  assert.equal(displacement(440,440),1);
  const questions=RegistryContent.bank.filter(question=>StudyFocus.matches(question,'artifact'));
  assert.equal(lessons.length,12);
  const asset=ArtifactAcademy.images.gibbs;
  assert.equal(createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex'),asset.sha256);
  assert.equal(questions.length,12);
  assert.deepEqual(RegistryCore.buildForm(RegistryContent.bank,RegistryBlueprints.arrt),
    RegistryCore.buildForm(RegistryContent.bank.filter(q=>!questions.includes(q)),RegistryBlueprints.arrt));
  for (const item of lessons) {
    const question=questions.find(q=>q.id==='art-'+item.id);
    assert.ok(StudyContentMap.lessons[item.physics],item.id);
    assert.equal(StudyReview.subject(question),'Artifacts');
    assert.match(StudyContentMap.related(question),new RegExp('lesson='+item.id+'$'));
    assert.ok(item.definition&&item.mechanism&&item.appearance&&item.correction&&item.pitfall);
    assert.deepEqual(question.references,[item.source]);
    assert.ok(question.hints.every(hint=>!hint.includes(question.options[0][0])));
  }
});

test('image question validation fails closed for missing images and attribution data',()=>{
  const q=RegistryContent.bank.find(question=>question.id==='n10');
  assert.ok(RegistryImageView.valid(q));
  assert.equal(RegistryImageView.valid({...q,image:undefined}),false);
  assert.equal(RegistryImageView.valid(q,{...RegistryImages[q.image],sha256:undefined}),false);
  assert.equal(RegistryImageView.valid(q,{...RegistryImages[q.image],licenseUrl:undefined}),false);
  assert.deepEqual(RegistryContent.bank.filter(question=>!RegistryImageView.valid(question)).map(q=>q.id),[]);
});


require('../parameter-model.js');
require('../registry-bank-parameters.js');
test('parameter lab scenarios and questions preserve controlled assumptions and timed forms',()=>{
  const {parameters,estimate,baseline,idFor,labels}=ParameterModel;
  assert.equal(new Set(parameters.map(p=>p.id)).size,14);
  const questions=RegistryContent.bank.filter(q=>q.id.startsWith('param-'));
  assert.equal(questions.length,32);
  assert.ok(questions.every(q=>q.studyOnly&&q.hints.length===2));
  for(const p of parameters){
    assert.equal(p.effects.length,7);
    assert.ok(StudyContentMap.lessons[p.lesson]);
    for(const index of p.quiz){
      const q=questions.find(q=>q.id===idFor(p,index));
      assert.equal(q.options[q.key[0]][0],labels[p.effects[index].direction]);
      assert.match(q.related,new RegExp(p.id+'$'));
      assert.ok(q.stem.startsWith(p.assumptions));
    }
  }
  const effect=(id,index)=>parameters.find(p=>p.id===id).effects[index].direction;
  assert.equal(effect('te',1),'=');
  assert.equal(effect('nex',3),'=');
  assert.equal(effect('flip',0),'?');
  assert.equal(effect('slices',1),'?');
  const current=estimate(baseline);
  assert.equal(current.time,20);
  assert.equal(current.pitch,220/160);
  assert.equal(current.voxel,220/160*220/192*4);
  assert.equal(estimate({...baseline,nex:4}).snrFactor,2);
  assert.equal(estimate({...baseline,bandwidth:440}).shift,1);
  assert.equal(estimate({...baseline,matrix:161}).time,20.5);
  assert.ok(estimate({...baseline,te:40}).softTissue<current.softTissue);
  assert.deepEqual(RegistryCore.buildForm(RegistryContent.bank,RegistryBlueprints.arrt),
    RegistryCore.buildForm(RegistryContent.bank.filter(q=>!questions.includes(q)),RegistryBlueprints.arrt));
});

require('../registry-bank-clinical.js');
test('new clinical banks have unique objectives, preserved mock forms, and referenced options',()=>{
  const all=RegistryContent.bank;
  const items=all.filter(q=>/^(positioning|safety|pathology)-/.test(q.id));
  assert.equal(items.length,45);
  assert.equal(new Set(items.map(q=>q.stem)).size,45);
  assert.equal(all.filter(q=>StudyFocus.matches(q,'positioning')&&!q.pilot).length,23);
  assert.equal(all.filter(q=>StudyFocus.matches(q,'clinical-safety')&&!q.pilot).length,29);
  assert.equal(all.filter(q=>StudyFocus.matches(q,'pathology')&&!q.pilot).length,21);
  for(const q of items){
    assert.ok(q.studyOnly&&q.references.length&&q.hints.length===2&&q.related,q.id);
    assert.ok(q.options.every(([choice,reason])=>choice&&reason),q.id);
    assert.equal(new Set(q.options.map(([choice])=>choice)).size,3,q.id);
  }
  assert.deepEqual(RegistryCore.buildForm(all,RegistryBlueprints.arrt),
    RegistryCore.buildForm(all.filter(q=>!items.includes(q)),RegistryBlueprints.arrt));
});

test('bundled MRA retains the licensed source bytes and near-RAS geometry',async()=>{
  const manifest=JSON.parse(fs.readFileSync('atlas/mra/manifest.json'));
  const bytes=fs.readFileSync(manifest.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
  const {dim,affine,hi,lo}=await parse(bytes);
  assert.deepEqual(dim,manifest.dimensions);
  assert.ok(affine[0]>.5&&affine[5]>.5&&affine[10]>.6);
  assert.ok(Math.abs(affine[2])>.04,'keep the oblique sform');
  assert.ok(hi>100&&lo===0);
  assert.equal(manifest.markers.length,0);
});

require('../atlas-coverage.js');
test('regional coverage distinguishes acquisitions, partial coverage and missing data',()=>{
  const {targets,byRegion,packs}=AtlasCoverage;
  assert.equal(new Set(targets.map(row=>row.id)).size,targets.length);
  for(const key of ['iac','lumbar','prostate','mra']){
    assert.equal(byRegion[key].state,'available');
    assert.ok(fs.existsSync(packs[key].path));
  }
  assert.equal(byRegion.thoracic.state,'partial');
  assert.equal(byRegion.mrv.pack,'');
});

test('new atlas volumes have licensed hashes, aligned masks and in-mask anchors',async()=>{
  for(const key of ['iac','lumbar','prostate']){
    const {path,oblique}=AtlasCoverage.packs[key];
    const manifest=JSON.parse(fs.readFileSync(path));
    assert.match(manifest.license,/CC BY/);
    const [volume,labels]=await Promise.all(manifest.volumes.map(async entry=>{
      const bytes=fs.readFileSync(entry.path);
      assert.equal(bytes.length,entry.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
      return parse(bytes);
    }));
    verifyAtlasGrid(volume,labels,{oblique});
    assert.deepEqual(volume.dim,manifest.dimensions);
    assert.ok(volume.dim.every(n=>n>=15));
    assert.ok(volume.hi>volume.lo);
    for(const [id,point] of Object.entries(manifest.anchors)){
      assert.equal(labels.p[voxelIndex(labels.dim,point)],Number(id),key+' '+id);
      assert.ok(volume.p[voxelIndex(volume.dim,point)]>0);
    }
    assert.ok(!fs.readFileSync('sw.js','utf8').includes(manifest.volumes[0].path));
  }
});
