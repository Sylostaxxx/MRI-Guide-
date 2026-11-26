(() => {
  const packs={
    iac:{id:'iac1',title:'IAC / CPA MRI Atlas',cache:'mri-iac-atlas-1',path:'atlas/iac/manifest.json',
      intro:'Explore an axial high-resolution T2 study from a vestibular schwannoma case.',
      anchor:2,label:'Source contour',coordinates:'RAS',preview:'./atlas/iac/preview.webp'},
    lumbar:{id:'lumbar1',title:'Lumbar Spine MRI Atlas',cache:'mri-lumbar-atlas-1',path:'atlas/lumbar/manifest.json',
      intro:'Explore the lower spine and published labels on a 3D sagittal T2 SPACE acquisition.',
      anchor:201,label:'SPIDER source label',coordinates:'RAS',preview:'./atlas/lumbar/preview.webp'},
    prostate:{id:'prostate1',title:'Prostate MRI Atlas',cache:'mri-prostate-atlas-1',path:'atlas/prostate/manifest.json',
      intro:'Explore prostate zones on an oblique axial T2 acquisition. Orthogonal voxel-plane reformats have limited detail.',
      anchor:2,label:'MSD source label',coordinates:'RAS',preview:'./atlas/prostate/preview.webp',oblique:true},
    mra:{id:'mra1',title:'Intracranial MRA',cache:'mri-intracranial-mra-1',path:'atlas/mra/manifest.json',
      intro:'Explore a processed MR angiography teaching volume. The publisher does not specify the acquisition technique.',
      anchor:null,label:'',coordinates:'RAS',oblique:true}
  };
  const states={available:'Verified real MRI available',partial:'Verified real MRI available · partial coverage',
    acquired:'Dataset acquired, validation pending',candidate:'Dataset source identified, download pending',
    missing:'Suitable licensed dataset not yet found',blocked:'Blocked by licensing, access or technical limitations'};
  const targets=[
    ['brain','Brain','available','brain','T1 population-average atlas with CerebrA labels. Original source and atlas derivatives documented.'],
    ['cerebellum','Cerebellum and brainstem','available','brain','Included in the CerebrA atlas and label set.'],
    ['iac','Internal auditory canals and CPA','available','iac','One axial high-resolution 3D T2 acquisition, with publisher-derived contours.'],
    ['inner-ear','Inner ear','partial','iac','Cochlear contour from one side. No complete labyrinth segmentation.'],
    ['cranial-nerves','Cranial nerves','candidate','','High-resolution IAC acquisition is available, but broader nerve coverage and validated individual landmarks remain pending.'],
    ['orbits','Orbits','missing','','Dedicated orbital MRI is required.'],
    ['pituitary','Pituitary and sella','missing','','Illustrated reference only.'],
    ['sinus','Paranasal sinuses','missing','','No dedicated MRI integrated.'],
    ['face','Face and skull base','missing','','No dedicated MRI integrated.'],
    ['mra','Intracranial MRA','available','mra','Processed teaching volume. Acquisition details and vessel labels unavailable.'],
    ['mrv','Intracranial MRV','missing','','An arterial MRA does not establish venous atlas coverage.'],
    ['neck','Neck','missing','','No dedicated MRI integrated.'],
    ['cervical','Cervical spine','available','spine','T1 acquisition with manually verified point landmarks.'],
    ['thoracic','Thoracic spine','partial','spine','Upper thoracic coverage only; complete thoracic series pending.'],
    ['lumbar','Lumbar spine','available','lumbar','One sagittal T2 SPACE acquisition, cropped around all SPIDER source labels.'],
    ['sacrum','Sacrum','partial','lumbar','Lower lumbar acquisition includes adjacent lumbosacral anatomy. Dedicated sacrum study pending.'],
    ['si','Sacroiliac joints','missing','','Dedicated SI MRI pending.'],
    ['cord','Spinal cord','partial','spine','Cervical segment and upper thoracic coverage. No cord-specific segmentation.'],
    ['shoulder','Shoulder','missing'],['arm','Arm','missing'],['elbow','Elbow','missing'],['forearm','Forearm','missing'],
    ['wrist','Wrist','missing'],['hand','Hand and fingers','missing'],['hip','Hip','blocked','','Published studies reviewed. Redistributable paired raw data and labels are still needed.'],
    ['thigh','Thigh','blocked','','MyoSegmenTUM project and file API were inaccessible during dataset review.'],
    ['knee','Knee','available','knee','One DESS acquisition with femur and femoral cartilage masks.'],
    ['leg','Lower leg','missing'],['ankle','Ankle','missing'],['hindfoot','Hindfoot','missing'],
    ['midfoot','Midfoot','missing'],['forefoot','Forefoot and toes','missing'],['foot','Whole foot','missing'],
    ['chest','Chest','missing'],['heart','Cardiac','partial','cardiac','Left atrial crop, not a full cardiac examination.'],
    ['breast','Breast','candidate','','TCIA breast MRI collections need per-series licensing, selection and orientation checks.'],
    ['liver','Liver','missing'],['pancreas','Pancreas','missing'],['kidneys','Kidneys','missing'],['adrenal','Adrenals','missing'],
    ['mrcp','MRCP','missing'],['abdomen','Abdomen','missing'],['pelvis','Pelvis','partial','prostate','One prostate-focused T2 series. No general pelvis survey.'],
    ['prostate','Prostate','available','prostate','T2 and source zone labels. ADC, complete multiparametric protocol and validated quiz pending.'],
    ['female-pelvis','Female pelvic anatomy','missing'],['vascular','Major vascular regions','partial','mra','Intracranial arterial teaching example only. Other vascular territories pending.'],
    ['long-bones','Long bones','partial','knee','A single knee acquisition shows part of the distal femur and adjacent bones. Dedicated shaft coverage pending.'],
    ['soft-tissues','Superficial soft tissues','missing'],['specialized','Other specialized examinations','missing']
  ].map(([id,name,state,pack='',limit='No suitable acquisition integrated.'])=>({id,name,state,pack,limit}));
  const byRegion=Object.fromEntries(targets.map(row=>[row.id,row]));
  const route=pack=>'./brain-atlas.html?region='+encodeURIComponent(pack);
  globalThis.AtlasCoverage={packs,states,targets,byRegion,route};
})();
