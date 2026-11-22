(() => {
  const {add,lines}=RegistryContent;
  const destinations={brain:['brain','cerebra1'],spine:['spine','spine1'],knee:['knee','knee1'],heart:['cardiac','cardiac1']};
  function visual(category,id,topic,stem,options,{studyOnly=false}={}){
    const img=RegistryImages[id], [atlas,pack]=destinations[img.region];
    add({category,id,topic,stem,options,source:img.region,image:id,studyOnly,
      related:'./brain-atlas.html?'+new URLSearchParams({region:atlas,label:img.label}),
      structureId:pack+':'+img.label});
  }
  function marker(category,id,topic,options){
    visual(category,id,topic,'Which structure is indicated by the arrow on this MR image?',options);
  }
  marker('neuro','n01','Thalamus',[
    ['Thalamus','A deep gray structure alongside the third ventricle; the arrow endpoint was verified in the left thalamus.'],
    ['Caudate head','The caudate head borders the frontal horn further anteriorly.'],
    ['Putamen','The putamen is lateral to the internal capsule.'],
    ['Hippocampus','The hippocampus is in the medial temporal lobe.']]);
  marker('neuro','n02','Caudate',[
    ['Caudate','The marked gray matter is part of the caudate adjacent to the lateral ventricle.'],
    ['Claus­trum','The claustrum is a thin lateral gray matter sheet.'],
    ['Pituitary gland','The pituitary lies in the sella, below the brain.'],
    ['Optic chiasm','The chiasm is suprasellar and midline.']]);
  marker('neuro','n03','Putamen',[
    ['Putamen','This is lateral deep gray matter in the lentiform region.'],
    ['Third ventricle','That is a midline CSF space.'],
    ['Pons','The pons lies below the midbrain in the brainstem.'],
    ['Corpus callosum','It is a commissural white-matter tract near the midline.']]);
  marker('neuro','n04','Hippocampus',[
    ['Hippocampus','The medial temporal structure is adjacent to the temporal horn.'],
    ['Cerebellar vermis','The vermis lies in the midline of the posterior fossa.'],
    ['Globus pallidus','The pallidum is deep gray matter medial to the putamen.'],
    ['Centrum semiovale','This is supraventricular cerebral white matter.']]);
  marker('neuro','n05','Brainstem',[
    ['Brainstem','The marked structure connects the diencephalon and upper cervical cord anterior to the cerebellum.'],
    ['Cerebellar hemisphere','The cerebellum is posterior to the brainstem.'],
    ['Splenium','The splenium is the posterior part of the corpus callosum.'],
    ['Lateral ventricle','Lateral ventricles lie within the cerebrum.']]);
  marker('neuro','n06','Fourth ventricle',[
    ['Fourth ventricle','This CSF cavity lies anterior to the cerebellum and posterior to the pons and upper medulla.'],
    ['Third ventricle','The third ventricle lies higher between the thalami.'],
    ['Frontal horn','The frontal horns are in the cerebral hemispheres.'],
    ['Sella','The sella is a skull-base bony compartment.']]);
  marker('neuro','n07','Lateral ventricle',[
    ['Lateral ventricle','The arrow is within a lateral ventricular CSF space.'],
    ['Caudate nucleus','Caudate tissue borders part of the ventricle but is gray matter rather than its lumen.'],
    ['Internal capsule','The capsule is a white-matter bundle.'],
    ['Subarachnoid sulcus','A sulcus is on the cerebral surface rather than in the ventricle.']]);
  marker('neuro','n08','Cerebellar cortex',[
    ['Cerebellar gray matter','The thin cortex follows the cerebellar folia and the verified label is cortical.'],
    ['Cerebellar white matter','Deep white matter is internal to the folial cortex.'],
    ['Medial temporal cortex','The temporal lobe lies above the tentorium.'],
    ['Lateral ventricle','This is a supratentorial CSF space.']]);
  marker('neuro','n09','Optic chiasm',[
    ['Optic chiasm','The chiasm lies above the sella where nasal retinal fibers cross.'],
    ['Pituitary gland','The gland is inferior to the chiasm within the sella.'],
    ['Mammillary body','Mammillary bodies are more posterior at the hypothalamic base.'],
    ['Anterior horn of a lateral ventricle','The ventricular horns lie much higher.']]);
  for(const [id,level,context,wrong] of [
    ['n10','C2–C3','First true intervertebral disc below the axis.',['C1–C2','C3–C4','C4–C5']],
    ['n11','C4–C5','A midcervical disc, two levels caudal to C2–C3.',['C2–C3','C3–C4','C5–C6']],
    ['n12','C7–T1','The disc at the cervicothoracic junction between the last cervical and first thoracic vertebrae.',['C5–C6','C6–C7','T1–T2']],
    ['n13','T3–T4','Count inferiorly from the cervicothoracic junction to the third thoracic interspace.',['T1–T2','T2–T3','T4–T5']]
  ]){
    const target=RegistryImages[id];
    if(target.labelName!==level+' disc')throw Error('Unexpected spine landmark');
    visual('neuro',id,'Vertebral level identification','Which disc level is indicated by the arrow on this sagittal spine localizer?',
      [[level,context],...wrong.map(name=>[name,(name==='C1–C2'?'The atlas and axis articulate without a normal intervertebral disc.':name.localeCompare(level)<0?'This is a more cranial interspace than the labeled landmark.':'This is a more caudal interspace than the labeled landmark.')])]);
  }
  visual('neuro','n14','Orthogonal brain planes','What plane is shown in this MR image of the brain?',[
    ['Axial','Both hemispheres and the transverse relationship of the ventricular and deep gray structures are shown.'],
    ['Coronal','A coronal plane depicts a superior-to-inferior view of both hemispheres, with a different ventricular profile.'],
    ['Sagittal','A sagittal section runs front to back and usually profiles one hemisphere or the midline.'],
    ['Curved planar reformation','The image is a straight orthogonal section of the source volume.']]);
  visual('neuro','n15','Sequence appearance','CSF is dark and white matter is relatively bright in this noncontrast structural reference. Which weighting best fits?',
    [['T1 weighted','This T1 reference shows dark CSF and comparatively bright white matter.'],['T2 weighted','Free CSF is typically bright on conventional T2.'],
    ['ADC map','ADC highlights diffusivity, and free CSF typically has high apparent diffusion.'],['TOF angiographic MIP','This is structural tissue contrast rather than a vessel projection.']]);
  lines('neuro',`
n16|MS protocol|appropriateness|Which brain sequence helps demonstrate a periventricular lesion adjacent to CSF by suppressing the bright fluid contribution?|T2 FLAIR~CSF suppression improves conspicuity of many adjacent T2-hyperintense lesions.|Unenhanced TOF projection~TOF primarily depicts inflowing blood in vessels.|A susceptibility-only projection~SWI is useful for specific findings but does not provide conventional FLAIR contrast.|A low-resolution localizer only~Localizers are used to plan higher-quality acquisitions.
n17|Epilepsy planning|appropriateness|How should a dedicated coronal oblique sequence be oriented to evaluate hippocampal internal architecture?|Perpendicular to the long axis of the hippocampus~This provides comparable cross-sectional views of medial temporal structures.|Parallel to the long axis only~This may display length but is less suitable for consistent cross sections.|Tangent to the frontal calvarium~That is unrelated to hippocampal orientation.|Along the internal auditory canal~The IAC is a different skull-base target.
n18|Pituitary protocol|appropriateness|Which approach best addresses suspected small pituitary pathology?|Thin-section sellar imaging in appropriate orthogonal planes~A dedicated small-field protocol improves spatial detail of the gland and adjacent anatomy.|A large-FOV thick-slice whole-spine series~It lacks dedicated sellar resolution and coverage.|Only a knee coil localizer~An extremity localizer cannot assess the sella.|An ADC projection alone~It is not a substitute for dedicated sellar anatomy.
n19|IAC protocol|appropriateness|What anatomical course should dedicated internal auditory canal coverage include?|From the cerebellopontine angle through the internal auditory canal to its fundus~Following the canal captures the cisternal and canalicular segments relevant to the exam.|Only the vertex and sagittal sinus~That excludes the temporal bone region.|The external ear to the mandibular symphysis only~This does not cover the internal canal and CPA.|The orbital apex through the optic canal~That is a different cranial nerve pathway.
n20|Orbital imaging|appropriateness|Which technique helps separate an enhancing optic nerve lesion from bright orbital fat on T1 images?|Fat-suppressed postcontrast T1 imaging when indicated~Suppressing orbital fat can improve conspicuity of enhancement.|A noncontrast MIP of carotid flow~Vessel projections do not show the needed enhancement contrast.|A long-TE sequence without regard to fat~It does not directly address enhancement on T1.|A whole-spine localizer~Its resolution and coverage are unsuitable for the orbits.
n21|Cervical planning|appropriateness|When planning a small axial cervical series for suspected focal disc disease, what should guide its position?|Correlate with sagittal localization and cover the affected levels and adjacent relevant anatomy~The sagittal images establish level and guide axial coverage.|Use the same scanner coordinate for every patient~Relative table position differs across patients.|Orient using only the head coil's outer shell~Coil geometry does not determine disc-level anatomy.|Use only a coronal chest landmark~That does not reliably localize cervical discs.
n22|Thoracic spinal anatomy||Which structure remains in the thoracic spinal canal in a typical adult?|Spinal cord~The conus is usually in the upper lumbar region, so the cord traverses the thoracic canal.|Only cauda equina roots~Those roots are predominantly below the conus.|Femoral artery~It is outside the spinal canal in the lower limb.|Optic tract~It is intracranial.
n23|Lumbar anatomy||On a typical adult MRI, which structure occupies the thecal sac below the conus?|Cauda equina nerve roots and CSF~The lumbar and sacral roots descend within CSF toward their exiting levels.|Cervical spinal cord~The cord generally terminates above the lower lumbar levels.|Internal auditory nerves~These structures are in the temporal bone region.|Aortic arch~The aortic arch is thoracic and outside the canal.
n24|MR venography|appropriateness|Which check helps distinguish a true dural sinus filling defect from a projection or flow artifact?|Review source images and complementary sequences or contrast information as indicated~Projection images can omit slow or complex flow, so source correlation matters.|Diagnose thrombosis solely from a missing segment on one projection~A flow gap can mimic pathology.|Increase the display font size~Image annotations do not resolve vascular findings.|Turn off all motion-sensitive acquisitions~That does not establish whether a defect is real.
n25|CSF flow|advanced|Which technique can measure pulsatile CSF velocity across the aqueduct when positioned appropriately?|Cardiac-synchronized phase-contrast MRI~Velocity-sensitive phase records the direction and magnitude of motion across the plane.|Static noncontrast T1 only~Anatomic intensity alone does not quantify pulsatile velocity.|SWI minimum projection only~This depicts susceptibility-related structures rather than quantitative CSF flow.|A proton density knee sequence~Its coverage and encoding are unrelated.
`);

  lines('body',`
b01|Liver chemical shift|advanced|Which finding on a properly acquired opposed-phase image supports intracellular fat compared with in-phase?|Signal loss in the affected liver tissue~Water and fat within a voxel partially cancel when opposed.|Signal loss only within the spleen by definition~The question concerns fat and water within liver voxels.|A mandatory increase in liver signal~Coexisting fat and water can reduce magnitude on opposed-phase images.|Disappearance of every vessel on both echoes~Vessel signal is not the specific finding.
b02|MRCP contrast|appropriateness|Why are heavily T2-weighted images used for MRCP?|Relatively stationary ductal fluid remains bright as shorter-T2 background signal decays~This emphasizes biliary and pancreatic duct fluid.|Bile must always be filled with injected gadolinium~MRCP uses endogenous fluid contrast in typical practice.|High b-values directly show all duct walls~Diffusion imaging is not the basis of MRCP duct visualization.|The sequence intentionally nulls all fluids~The ducts are highlighted by fluid signal.
b03|Pancreatic anatomy||Which portion of the pancreas lies within the C-loop of the duodenum?|Pancreatic head~The duodenum curves around the pancreatic head.|Pancreatic tail~The tail extends toward the splenic hilum.|Splenic hilum itself~It is associated with the tail, not the duodenal loop.|Left adrenal gland~It lies retroperitoneally near the upper left renal pole.
b04|Adrenal lesion characterization|appropriateness|Which imaging comparison can reveal microscopic lipid in a typical lipid-rich adrenal adenoma?|In-phase and opposed-phase T1 GRE~Signal drop supports intracellular lipid when acquisition and interpretation are appropriate.|Two identical T2 images without a chemical-shift difference~That comparison does not isolate water-fat cancellation.|A TOF venogram alone~Vascular flow contrast does not assess intracellular lipid.|Two projections with different window widths~Display changes do not create chemical-shift contrast.
b05|Renal anatomy||Which structure receives urine from the calyces and continues as the ureter?|Renal pelvis~The pelvis funnels urine into the ureter.|Renal vein~It drains venous blood.|Renal cortex~It contains glomeruli and cortical tubules rather than the collecting funnel.|Adrenal medulla~It is endocrine tissue.
b06|Enterography technique|appropriateness|Why is adequate bowel distention important for MR enterography?|It helps separate the lumen from the wall and assess mural thickening~Collapsed segments can imitate wall thickening or obscure lesions.|It guarantees no bowel motion~Distention does not eliminate peristalsis.|It reduces the need for appropriate fluid-sensitive imaging~Distention and sequence contrast address different issues.|It determines image orientation tags~Those tags describe the imaging coordinate system.
b07|Rectal planning|appropriateness|For local rectal tumor staging, which axial oblique prescription best assesses mural depth?|Perpendicular to the long axis of the involved rectal segment~A perpendicular plane reduces obliquity when evaluating wall layers and spread.|Always parallel to the scanner table without reviewing the lesion~The rectal segment may be curved or oblique.|Through the entire field using only a scout~Scout resolution is insufficient for local staging.|At the level of the upper kidneys~That misses the local pelvic target.
b08|Prostate anatomy||Which prostate region generally lies posterolateral and is commonly relatively bright on normal T2 images?|Peripheral zone~The peripheral zone surrounds the posterior and lateral gland and generally has high T2 signal.|Anterior fibromuscular stroma~It is predominantly stromal and usually low T2 signal.|Seminal vesicle lumen~The seminal vesicles are outside the prostate.|Penile urethra~It is below the gland.
b09|Uterine anatomy||Which uterine MRI sequence is particularly useful for showing zonal anatomy and the junctional zone?|Multiplanar T2 weighted imaging~T2 contrast differentiates endometrium, junctional zone and outer myometrium.|TOF MR angiography alone~Vascular inflow is unrelated to zonal anatomy contrast.|An isolated low-resolution localizer~It does not resolve uterine wall layers adequately.|A SWI projection of the brain~It is anatomically and technically unrelated.
b10|Bladder and pelvis coverage|appropriateness|When evaluating whether a pelvic stack covers the bladder, what should be checked first?|Orthogonal localizers show the bladder from dome through base and relevant adjacent anatomy~Coverage should match the organ and exam indication.|Only the number of images is correct~Slice count alone does not establish position or coverage.|Only the volume center intersects the bladder~A centered stack can still truncate the dome or base.|The images are stored in newest-first order~Sorting does not determine coverage.
b11|Breast setup|appropriateness|What is the primary positioning goal with a dedicated prone bilateral breast coil?|Center both breasts within the coil without skin folds or avoidable compression and verify coverage~Positioning affects sensitivity, symmetry and anatomic coverage.|Fold the breasts tightly outside the coil openings~That compromises coverage and position.|Use a head coil because the breast exam is bilateral~A head coil is not the dedicated breast setup.|Rely on contrast injection to correct positioning~Contrast does not compensate for missing anatomy.
b12|Breast subtraction|advanced|What can create a false signal on precontrast-minus-postcontrast image comparisons with subtraction?|Motion or misregistration between acquisitions~Edges can shift and produce false differences in the subtraction image.|Identical positioning with no signal change~Well-aligned unchanged signal tends to subtract out.|Properly timed image labeling only~Labels do not directly create subtraction artifact.|A change in patient birth date metadata~This is a data integrity issue, not the image mechanism.
b13|Thoracic motion|appropriateness|What helps reduce respiratory blurring for a breath-hold thoracic sequence?|Coach the breathing command and confirm a tolerable breath-hold duration~Consistent breath holding can reduce respiration-related motion.|Ask the patient to alternate deep breaths mid-acquisition~This can worsen respiratory motion.|Omit time estimates until after the scan~Preparation helps the patient cooperate.|Change only reconstructed pixel spacing afterward~Interpolation cannot reverse motion in the source.
b14|Brachial plexus coverage|anatomy|Which anatomic extent is most relevant when checking a brachial plexus acquisition?|Lower cervical roots through the supraclavicular region toward the axilla~These landmarks follow the plexus toward the upper limb.|Lumbar roots through the femoral triangle only~That is unrelated to brachial plexus anatomy.|Only the midline brainstem~That does not cover the plexus.|Only the distal forearm~The proximal plexus lies outside this FOV.
b15|Abdominal vascular timing|contrast|In a dynamic vascular abdominal series, how should the technologist confirm the intended arterial phase is captured?|Review enhancement pattern and correlate with the selected acquisition or bolus timing~Arterial dominance should be checked on actual source images.|Assume any postcontrast image is arterial~Later phases may show predominant venous or parenchymal enhancement.|Infer phase solely from the image filename~Filename alone is unreliable.|Use only a precontrast slab to decide timing retrospectively~Precontrast anatomy does not demonstrate bolus arrival.
`);
  marker('msk','m01','Distal femur',[
    ['Distal femur','The marked osseous structure lies above the tibial plateau and is verified as femur.'],
    ['Proximal tibia','The tibia lies inferior to the joint space.'],
    ['Patella','The patella lies anterior to the distal femur.'],
    ['Femoral articular cartilage','Cartilage is the thin articular surface layer rather than the marked bone interior.']]);
  marker('msk','m02','Femoral articular cartilage',[
    ['Femoral articular cartilage','The arrow terminates in the source mask covering the distal femur.'],
    ['Femoral marrow','Marrow lies internal to the cortex and subchondral bone.'],
    ['Quadriceps tendon','This tendon inserts proximally on the patella.'],
    ['Meniscus','A meniscus is fibrocartilage between the femur and tibia rather than the surface layer covering femoral bone.']]);
  visual('msk','m03','Knee imaging planes','Which plane is shown in this knee image?',[
    ['Coronal','The compartment profile shows medial–lateral and superior–inferior relationships.'],
    ['Axial','An axial section primarily shows transverse anatomy.'],
    ['Sagittal','A sagittal section shows anterior–posterior and superior–inferior relationships.'],
    ['Oblique long axis of the ACL','This is an orthogonal reformat of the source volume.']]);
  visual('msk','m04','Volumetric knee coverage','This axial knee slice comes from a 3D DESS volume. Which check best establishes whole-stack anatomical coverage?',
    [['Scroll source images and review linked reformats through the prescribed superior and inferior landmarks','One slice cannot establish whether the full span was acquired.'],
    ['Confirm only the central slice has good signal','Central signal does not verify both ends of the volume.'],
    ['Use only the arrow marker from a different case','A marker describes a point, not stack coverage.'],
    ['Judge coverage only by the display zoom factor','Zoom changes display scale rather than acquired extent.']]);
  lines('msk',`
m05|Shoulder planning|appropriateness|Which reference helps plan a coronal oblique series to evaluate the supraspinatus?|Align to the supraspinatus tendon course on an axial reference~This improves depiction along the tendon.|Align to the lumbar disc spaces~They are unrelated to rotator-cuff orientation.|Choose the table edge as the only landmark~Patient and tendon angulation vary.|Prescribe tangentially to the skin without localizer review~Skin contour alone does not show tendon orientation.
m06|Rotator cuff anatomy||Which tendon primarily inserts at the superior facet of the greater tubercle?|Supraspinatus~The supraspinatus commonly inserts at the superior greater tubercle facet.|Subscapularis~It primarily inserts at the lesser tubercle.|Long head of biceps~Its proximal attachment is at the superior labral/supraglenoid region.|Pectoralis major~It inserts on the humerus at the lateral lip of the intertubercular sulcus.
m07|Elbow anatomy||Which structure inserts on the radial tuberosity?|Distal biceps tendon~Its insertion on the radius supports supination and flexion.|Distal triceps tendon~The triceps inserts at the olecranon.|Common extensor tendon~Its proximal origin is lateral humeral epicondyle.|Ulnar nerve~A nerve does not insert there as a tendon.
m08|Wrist anatomy||Which nerve passes through the carpal tunnel with the flexor tendons?|Median nerve~It courses deep to the flexor retinaculum within the tunnel.|Ulnar nerve~At the wrist it passes through Guyon canal, separate from the carpal tunnel.|Superficial radial nerve~It travels in a superficial radial location.|Posterior interosseous nerve at the elbow~That is not a carpal tunnel structure.
m09|Hand anatomy||Which digit normally has two phalanges rather than three?|Thumb~The thumb has a proximal and distal phalanx.|Index finger~It typically has proximal, middle, and distal phalanges.|Middle finger~It normally has three phalanges.|Small finger~It normally has three phalanges.
m10|Hip anatomy||What structure deepens the acetabular socket at its rim?|Acetabular labrum~This fibrocartilaginous structure extends around the socket rim.|Iliopsoas tendon~The tendon crosses anteriorly toward the lesser trochanter.|Femoral neck cortex~It is part of the femur rather than the acetabular rim.|Greater trochanteric bursa~It lies lateral to the joint.
m11|Hip occult fracture|appropriateness|When a fracture is suspected but radiographs are unrevealing, which combination can help show a fracture line and marrow edema?|T1 with a fluid-sensitive fat-suppressed sequence~The two contrasts help identify both low-T1 changes and edema.|TOF MRA only~Flow imaging is not designed for fracture assessment.|A single localizer only~Its limited resolution can miss pathology.|A postprocessed MIP of scalp vessels~This excludes the hip and does not show marrow.
m12|Knee cruciate anatomy||What movement does the anterior cruciate ligament primarily resist?|Anterior tibial translation relative to the femur~The ACL limits anterior translation and contributes to rotational stability.|Posterior tibial translation as its primary role~The PCL is the primary restraint to posterior translation.|Patellar inferior displacement only~The extensor mechanism and nearby soft tissues relate more directly to the patella.|Elbow hyperextension~The ACL is a knee ligament.
m13|Meniscal anatomy||Where are the menisci located?|Between the femoral condyles and tibial plateaus~Their fibrocartilage improves congruity and distributes load.|Between the patella and the quadriceps tendon~That is the extensor mechanism.|Within the femoral marrow cavity~Menisci are intracapsular joint structures, not marrow.|Between the calcaneus and Achilles insertion~That is the posterior ankle.
m14|Ankle anatomy||Where does the Achilles tendon insert?|Posterior calcaneus~It attaches the calf muscle complex to the calcaneus.|Base of the fifth metatarsal~This is an insertion of peroneus brevis.|Navicular tuberosity~This is associated with tibialis posterior insertion.|Medial malleolus cortex~The Achilles passes posteriorly to insert farther distal.
m15|Foot planning|appropriateness|What should guide the long-axis image prescription for a focal forefoot complaint?|Localizers and the involved metatarsal or toe anatomy~Foot orientation varies; align coverage to the target region.|A lumbar scout only~It does not show the area of interest.|The coil cable direction~Cable routing does not establish anatomic planes.|The scanner display zoom~Display zoom does not change acquired geometry.
m16|Soft-tissue mass assessment|appropriateness|What should a planning review capture for a limb mass before specialized acquisition?|The full lesion and its relationship to adjacent compartments and structures~Localizers and targeted images help ensure useful coverage.|Only the skin nearest the coil even if the deep margin is excluded~Incomplete coverage compromises assessment.|Only the contralateral limb~The suspected lesion is on the symptomatic side.|A single cropped image after the patient leaves~Cropping cannot recover missing coverage.
m17|Joint arthrography|appropriateness|What is the broad purpose of a direct MR arthrogram for selected joints?|Intra-articular contrast distends the joint and can outline internal structures or defects~Joint distention and contrast distribution help evaluate selected structures.|Contrast is injected only to measure heart rate~This is unrelated to its application.|It replaces safety and contraindication screening~The procedure requires appropriate screening.|It guarantees a normal joint result~Images are assessed for relevant abnormalities.
`);
  visual('body','x01','Left atrial anatomy (supplemental)','Which chamber is highlighted by the arrow?',
    [['Left atrium','The arrow endpoint is in the source left atrial segmentation.'],
    ['Right atrium','The right atrium is not the source of the labeled mask.'],
    ['Left ventricle','The ventricle lies downstream of the left atrium across the mitral valve.'],
    ['Right ventricle','This is the pulmonary outflow chamber, not the marked atrium.']],{studyOnly:true});
  visual('body','x02','Cardiac image planes (supplemental)','This image is reformatted along an orthogonal dataset plane. Which one is shown?',
    [['Coronal','The image uses the left–right and superior–inferior axes at fixed anterior–posterior position.'],
    ['Axial','Axial images hold the superior–inferior position fixed.'],
    ['Sagittal','Sagittal images hold left–right position fixed.'],
    ['Cardiac short-axis oblique','This image is a dataset coordinate section rather than a prescribed cardiac short axis.']],{studyOnly:true});
})();
