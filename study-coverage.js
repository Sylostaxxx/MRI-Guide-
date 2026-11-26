(() => {
  // Counts are active question IDs, rather than the number of menu labels.
  const rows = [
    ['Brain and cranial nerves','CerebrA T1','Brainstem and diencephalon','Brain cross section','CerebrA masks',11,6,'Brain planner','T1, T2 and neurological practice','MRI pack'],
    ['Intracranial MRA','NiiVue demonstration','—','Native oblique voxel slices and MIP','—',0,0,'—','MRA, inflow and flow artifact practice','Bundled MRI'],
    ['IAC, CPA and inner ear','TCIA axial 3D T2','—','Orthogonal MRI reformats','Tumor and one cochlea',0,0,'—','IAC anatomy reference','MRI pack'],
    ['Intracranial MRV','—','—','—','—',0,1,'—','Venous flow practice','Text'],
    ['Orbits, sinuses and skull base','—','Pituitary illustration','—','—',0,0,'—','Text and sellar anatomy references','Text and plate'],
    ['Head and neck','—','—','—','—',0,1,'—','Brachial plexus practice','Text'],
    ['Cervical spine','Spine Generic T1','Cervical illustration','Orthogonal MRI','Manual disc landmarks',3,1,'Cervical planner','Level localization','MRI pack'],
    ['Thoracic spine','Upper thoracic portion','—','Partial orthogonal MRI','Upper thoracic landmarks',1,1,'—','Thoracic spine practice','Shared spine pack'],
    ['Lumbar spine','SPIDER sagittal T2 SPACE','—','Orthogonal MRI reformats','Source vertebrae, discs and canal',0,1,'Schematic planner','Lumbar anatomy practice','MRI pack'],
    ['Sacrum and SI joints','—','—','—','—',0,1,'SI planning reference','Hip and pelvis library','Text'],
    ['Shoulder','—','—','—','—',0,2,'Schematic planner','Rotator cuff practice','Text'],
    ['Arm','—','Humerus','—','—',0,0,'—','Long-bone anatomy','Plate'],
    ['Elbow','—','Humeral landmarks','—','—',0,1,'—','Distal biceps practice','Text and plate'],
    ['Forearm','—','Radius and ulna','—','—',0,0,'—','Long-bone anatomy','Plate'],
    ['Wrist','—','Carpal tunnel and hand bones','—','—',0,4,'—','Carpal and tunnel practice','Text and plates'],
    ['Hand','—','Hand bones and carpal tunnel','—','—',0,4,'—','Digit and tendon anatomy practice','Text and plates'],
    ['Chest','—','Lungs','—','—',0,1,'—','Motion control practice','Text and plate'],
    ['Abdomen','—','Liver and kidney','—','—',0,7,'—','Abdominal pathology questions','Text and plates'],
    ['Pelvis','Prostate-focused T2 only','Uterus','Native oblique MRI reformats','Prostate zones',0,3,'Bilateral pelvis survey','Hip and pelvis library','MRI pack and plate'],
    ['Hip','—','Femur and hip muscles','—','—',0,12,'Unilateral, bilateral, arthrogram','Lower-extremity library','Text and plates'],
    ['Thigh','—','Hip and thigh muscles','Text compartments','—',0,8,'Thigh','Lower-extremity library','Text and plate'],
    ['Knee','pyKNEEr DESS','Knee joint','Orthogonal MRI and knee plate','Femur and femoral cartilage',7,16,'Knee, postoperative knee, real scout','Lower-extremity library','MRI pack'],
    ['Lower leg','—','Tibia and fibula','Text compartments','—',0,8,'Tibia/fibula','Lower-extremity library','Text'],
    ['Ankle','—','Foot and ankle bones','—','—',0,11,'Ankle and Achilles','Lower-extremity library','Text'],
    ['Foot','—','Foot bones','—','—',0,9,'Foot and forefoot','Lower-extremity library','Text'],
    ['Cardiac','MSD left atrial crop','Heart','Heart cross section','Left atrial mask',2,0,'—','Cardiac orientation practice','MRI pack'],
    ['Vascular','—','—','—','—',0,3,'Lower-extremity vascular overview','Flow and velocity practice','Text'],
    ['Specialized examinations','—','—','—','—',0,2,'Direct hip arthrogram reference','IR and perfusion lessons','Text']
  ];
  globalThis.StudyCoverage = {version:4,reviewed:'2026-11-26',rows:rows.map(row=>[
    ...row,row[1]!=='—'?'Partial MRI coverage':(row[2]!=='—'||row[6])?'Reference coverage':'Coverage gap'
  ])};
})();
