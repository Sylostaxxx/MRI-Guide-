// Short atlas reading prompts. Source references are displayed on the atlas page.
export const anatomyReference = {
  'Left atrium': {
    location: 'Posterior chamber of the heart, anterior to the esophagus. Pulmonary veins enter it, and the mitral valve leads to the left ventricle.',
    function: 'Collects oxygenated blood from the lungs and contributes to left ventricular filling.',
    imaging: 'Three-dimensional cardiac MRI can map the chamber and pulmonary venous anatomy. Atrial dilation is associated with mitral valve disease and atrial fibrillation.'
  },
  Femur: {
    location: 'The distal femur forms the upper part of the knee. Its medial and lateral condyles articulate with the tibia. The patella tracks along the anterior trochlea.',
    function: 'Transfers load to the tibia and provides attachment for ligaments and muscles.',
    imaging: 'T1 shows marrow and cortical anatomy. Fluid-sensitive fat-suppressed MRI can show occult fracture and marrow edema.'
  },
  'Femoral cartilage': {
    location: 'Articular cartilage covers the distal femoral condyles and trochlea. It overlies the subchondral bone.',
    function: 'Distributes load and provides a low-friction joint surface.',
    imaging: 'High-resolution DESS can delineate cartilage surfaces. Focal defects and diffuse thinning can occur with injury or osteoarthritis.'
  },
  Thalamus: {
    location: 'Deep gray matter bordering the third ventricle and medial to the posterior limb of the internal capsule.',
    function: 'Relays and integrates sensory and motor signals and participates in attention and arousal.',
    imaging: 'Axial T1 and T2 help compare the two thalami. DWI with ADC helps assess acute infarction.'
  },
  Hippocampus: {
    location: 'Medial temporal lobe, adjacent to the temporal horn of the lateral ventricle and the parahippocampal gyrus.',
    function: 'Supports formation of episodic memories and spatial navigation.',
    imaging: 'High-resolution coronal oblique T2 can show internal architecture. Mesial temporal sclerosis can produce volume loss and increased T2 or FLAIR signal.'
  },
  Caudate: {
    location: 'The head borders the frontal horn of the lateral ventricle. The body follows the ventricle posteriorly.',
    function: 'Part of the striatum, involved in motor and cognitive circuits.',
    imaging: 'Axial T1 shows the head medial to the anterior limb of the internal capsule. Caudate atrophy can enlarge the frontal horns in Huntington disease.'
  },
  Putamen: {
    location: 'Lateral to the globus pallidus and medial to the external capsule.',
    function: 'Part of the striatum, involved in movement and motor learning.',
    imaging: 'Axial T1 and T2 show its position relative to the internal and external capsules. Susceptibility-sensitive sequences help characterize blood products.'
  },
  Brainstem: {
    location: 'Midbrain, pons and medulla lie anterior to the cerebellum. The pons and upper medulla border the fourth ventricle.',
    function: 'Contains ascending and descending tracts and nuclei involved in cranial nerve and autonomic functions.',
    imaging: 'Sagittal T1 shows longitudinal anatomy. Axial T2 and diffusion images help evaluate focal lesions, including infarction.'
  },
  'Fourth Ventricle': {
    location: 'Between the posterior pons and upper medulla and the anterior cerebellum.',
    function: 'Carries CSF from the cerebral aqueduct toward the subarachnoid space.',
    imaging: 'CSF is normally dark on T1 and bright on T2. Sagittal T2 shows its position relative to the aqueduct and cerebellum. Posterior fossa masses can distort or compress it.'
  },
  'Lateral Ventricle': {
    location: 'Paired CSF spaces with horns extending into the frontal, temporal and occipital lobes.',
    function: 'Part of the ventricular system. CSF flows toward the third ventricle through each interventricular foramen.',
    imaging: 'Compare size and shape on axial T1 or T2. Ventricular enlargement can reflect hydrocephalus or parenchymal volume loss.'
  },
  'Optic Chiasm': {
    location: 'Above the pituitary gland and below the floor of the third ventricle.',
    function: 'Nasal retinal fibers cross here, carrying information about the contralateral visual field.',
    imaging: 'Thin-section coronal and sagittal T1 or T2 show its relationship to the pituitary. A suprasellar mass can elevate or compress it.'
  }
};

export const atlasContext = {
  'Left atrium':['Pulmonary veins, mitral valve, esophagus','3D cardiac MRI and cine bSSFP','Atrial dilation, thrombus and mitral valve disease','Defines atrial anatomy relevant to rhythm procedures and follow-up.'],
  Femur:['Tibial plateau, patella and articular cartilage','T1 and fat-suppressed proton-density or T2','Fracture, marrow edema and osteonecrosis','Marrow and cortical findings help localize osseous injury.'],
  'Femoral cartilage':['Subchondral bone, joint fluid and menisci','High-resolution DESS and fluid-sensitive knee MRI','Focal cartilage defects and osteoarthritis','Defect location and depth help describe articular surface damage.'],
  Thalamus:['Internal capsule, third ventricle and midbrain','T1, T2, FLAIR and DWI/ADC','Infarction, hemorrhage and inflammatory lesions','Laterality and vascular distribution help localize a thalamic lesion.'],
  Hippocampus:['Temporal horn, amygdala and parahippocampal gyrus','Coronal oblique high-resolution T2, FLAIR and 3D T1','Hippocampal sclerosis and volume loss','Compare size, internal architecture and signal when evaluating temporal lobe epilepsy.'],
  Caudate:['Frontal horn, anterior limb of the internal capsule and putamen','3D T1, T2 and FLAIR','Infarction and caudate atrophy in Huntington disease','The ventricle and internal capsule are useful landmarks for the extent of disease.'],
  Putamen:['Globus pallidus, external capsule and internal capsule','T1, T2, DWI and susceptibility-sensitive imaging','Infarction and hypertensive hemorrhage','Identify adjacent internal capsule involvement when describing a lesion.'],
  Brainstem:['Fourth ventricle, cerebellum and upper cervical cord','Sagittal T1, axial T2 and DWI/ADC','Infarction, demyelination and glioma','Small lesions can affect long tracts and cranial nerve nuclei.'],
  'Fourth Ventricle':['Cerebral aqueduct, pons, medulla and cerebellum','Sagittal and axial T2; high-resolution 3D T2 when indicated','Obstructive hydrocephalus and displacement by posterior fossa masses','Assess patency and changes in the rest of the ventricular system.'],
  'Lateral Ventricle':['Caudate, corpus callosum, thalamus and hippocampus','3D T1, axial T2 and FLAIR','Hydrocephalus and enlargement from volume loss','Compare size and morphology with prior studies and other signs of raised pressure.'],
  'Optic Chiasm':['Pituitary gland, optic nerves, optic tracts and third ventricle','Thin-section coronal and sagittal T1 and T2','Compression by a pituitary macroadenoma or other suprasellar mass','The relation to a suprasellar lesion informs assessment of visual pathway involvement.'],
  disc:['Adjacent vertebral endplates, posterior longitudinal ligament and spinal canal','Sagittal T1 and T2 with axial imaging at the affected level','Degeneration, protrusion and extrusion','Use the disc-level landmark with adjacent vertebral anatomy; the dot represents a point rather than the disc boundary.']
};

export const discReference = {
  location:'Between the two vertebral bodies named in the label.',
  function:'Distributes load and permits controlled motion between adjacent vertebrae.',
  imaging:'Hydrated nucleus pulposus is generally brighter on T2 than the annulus; desiccation can reduce signal and disc height.'
};
