(() => {
  const plates = ['skin','femur','quadriceps','brainstem','pituitary','heart','lymph','lungs','liver','kidney','uterus'];
  const regions = ['Body surface','Lower limb','Lower limb','Head','Head','Thorax','Abdomen','Thorax','Abdomen','Abdomen','Pelvis'];
  const expanded = {
    0:[['Dermis','Deep to the epidermis and above the hypodermis.','Contains connective tissue, vessels, sensory receptors and skin appendages.','Fibrosis, inflammation and dermal tumors.','skin']],
    1:[['Patella','Anterior to the femoral trochlea and within the knee extensor mechanism.','Improves the moment arm of the quadriceps.','Patellar fracture, maltracking and chondral injury.','femur']],
    2:[['Rectus femoris','Superficial anterior thigh between the iliac origin and the quadriceps tendon.','Extends the knee and flexes the hip.','Myotendinous strain and proximal avulsion.','quadriceps']],
    3:[['Thalamus','Paired deep gray matter, lateral to the third ventricle and medial to the internal capsule.','Relays and integrates information destined for the cerebral cortex.','Infarction, hemorrhage and inflammatory lesions.','diencephalon','brain','Left Thalamus']],
    4:[['Hypothalamus','Inferior to the thalamus and bordering the third ventricle.','Coordinates endocrine and autonomic responses and contributes to homeostasis.','Hamartoma and suprasellar mass involvement.','pituitary']],
    5:[['Left ventricle','Inferior to the left atrium, with myocardium surrounding the ventricular cavity.','Ejects oxygenated blood into the aorta.','Infarction, hypertrophy and cardiomyopathy.','heart']],
    6:[['Thoracic duct','Travels from the abdomen through the posterior mediastinum to the left venous angle.','Returns lymph from most of the body to the venous circulation.','Injury or obstruction can lead to chylothorax.','lymph',null,null,'Thorax']],
    7:[['Main bronchi','Begin at the carina and enter the lungs at the hila.','Conduct air into the lobar and segmental airways.','Foreign-body obstruction and bronchial tumors.','lungs']],
    8:[['Gallbladder','In a fossa on the visceral surface of the liver.','Stores and concentrates bile.','Cholelithiasis and cholecystitis.','liver']],
    9:[['Renal pelvis','Funnel-shaped collecting structure at the renal sinus that continues as the ureter.','Collects urine from the calyces.','Hydronephrosis and urothelial tumors.','kidney']],
    10:[['Ovary','Paired pelvic gonads lateral to the uterus.','Produces oocytes and ovarian hormones.','Functional cysts, torsion and ovarian neoplasms.','uterus']]
  };
  const facts = [
    ['Dermis, hypodermis, fascia','Skin is normally thin with variable contrast against subcutaneous fat.','T1 and fluid-sensitive fat-suppressed imaging.','Soft-tissue disease can extend beyond the skin into fascia.'],
    ['Patella, tibial plateau, distal femoral cartilage','Cortical bone is very low signal. Marrow signal depends on composition and weighting.','T1 and fluid-sensitive fat-suppressed knee MRI.','Helps localize marrow edema and distinguish it from cortical disruption.'],
    ['Femur, patella, quadriceps tendon','Normal muscle is intermediate signal on T1 and relatively low signal on fluid-sensitive images.','Axial T1 and fluid-sensitive fat-suppressed sequences.','MRI can show the site and extent of a muscle or tendon injury.'],
    ['Fourth ventricle, cerebellum, cervical cord','Gray and white matter contrast depends on weighting. CSF outlines parts of the posterior fossa.','Axial T2, FLAIR, DWI and sagittal T1.','Small lesions may affect densely packed long tracts and cranial nerve pathways.'],
    ['Optic chiasm, cavernous sinuses, hypothalamus','Enhancement and carefully timed imaging can help delineate lesions from normal gland.','Thin-section coronal and sagittal T1, with contrast as appropriate.','Superior extension can affect the optic chiasm.'],
    ['Pulmonary veins, mitral valve, esophagus','Blood pool contrast varies with acquisition and preparation.','Cine bSSFP and dedicated three-dimensional anatomy acquisitions.','Atrial size and pulmonary venous anatomy are important for planning and follow-up.'],
    ['Stomach, left kidney, diaphragm','Typically lower T1 signal than liver and relatively high T2 signal.','T1, T2, diffusion and contrast as appropriate.','Size, parenchymal signal and focal lesions guide differential assessment.'],
    ['Pleura, mediastinum, diaphragm','Aerated lung usually has low signal on conventional MRI.','Fast sequences for selected thoracic indications.','Low proton density and motion limit routine lung MRI.'],
    ['Gallbladder, diaphragm, portal and hepatic veins','Normal liver is generally intermediate signal. Fat and iron alter signal behavior.','In- and opposed-phase T1, T2, diffusion and dynamic contrast as appropriate.','Compare abnormalities across multiple phases and sequences.'],
    ['Renal sinus, adrenal gland, ureter','Corticomedullary contrast depends on weighting and contrast phase.','T2, T1, diffusion and dynamic contrast as appropriate.','Distinguish collecting-system dilation from a lesion or normal sinus fat.'],
    ['Bladder, rectum, cervix','The zonal anatomy is commonly best seen on T2. Appearance varies with age and hormonal status.','Multiplanar T2, DWI and contrast as appropriate.','Location and relation to the endometrium help characterize lesions.']
  ];
  const targets={1:'Femur',3:'Left Brainstem',5:'Left atrium'};
  globalThis.OrganCatalog=StudyContent.systems.map(([system,name,location,role,pathology,_,mri],index)=>{
    const primary={id:String(index),name,location,role,pathology,plate:plates[index],region:regions[index],
      mri,target:targets[index],facts:facts[index]};
    const entries=expanded[index].map(([name,location,role,pathology,plate,mri,target,region],i)=>
      ({id:index+'.'+(i+1),name,location,role,pathology,plate,mri,target,region:region??regions[index]}));
    return {system,entries:[primary,...entries]};
  });
})();
