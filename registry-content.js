(() => {
  const sources={
    physics:['MRI Physics · NCBI Bookshelf','https://www.ncbi.nlm.nih.gov/books/NBK564320/'],
    advanced:['Magnetic Resonance Imaging · NCBI Bookshelf','https://www.ncbi.nlm.nih.gov/books/NBK546152/'],
    safety:['ACR MR Safety resources','https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Radiology-Safety/MR-Safety'],
    contrast:['ACR Manual on Contrast Media','https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Contrast-Manual'],
    infection:['CDC Standard Precautions','https://www.cdc.gov/infection-control/hcp/basics/standard-precautions.html'],
    anatomy:['OpenStax Anatomy and Physiology 2e','https://openstax.org/details/books/anatomy-and-physiology-2e'],
    appropriateness:['ACR Appropriateness Criteria','https://acsearch.acr.org/list'],
    dicom:['DICOM Standard · current edition','https://www.dicomstandard.org/current'],
    qc:['ACR MRI quality control','https://accreditationsupport.acr.org/support/solutions/articles/11000061043-quality-control-mri'],
    ethics:['ARRT Standards of Ethics','https://www.arrt.org/pages/arrt-reference-documents/by-document-type/standards-of-ethics'],
    rights:['HHS HIPAA Privacy Rule','https://www.hhs.gov/hipaa/for-professionals/privacy/index.html'],
    care:['AHA Patient Care Partnership','https://www.aha.org/other-resources/patient-care-partnership'],
    brain:['CerebrA release','https://doi.org/10.12751/g-node.be5e62'],
    spine:['Spine Generic single-subject release','https://github.com/spine-generic/data-single-subject'],
    knee:['pyKNEEr reference MRI','https://doi.org/10.5281/zenodo.3820248'],
    heart:['Medical Segmentation Decathlon','https://medicaldecathlon.com/']
  };
  const bank=[];
  const defaultSource={physical:'physics',parameters:'physics',acquisition:'advanced',
    neuro:'anatomy',body:'anatomy',msk:'anatomy',safety:'safety',care:'care'};
  const area={physical:'./?section=physics',parameters:'./?section=physics&tool=sandbox',
    acquisition:'./real-scans.html',neuro:'./brain-atlas.html',body:'./brain-atlas.html?region=cardiac',
    msk:'./brain-atlas.html?region=knee',safety:'./study-center.html?section=safety',care:'./study-center.html?section=rotation'};
  const subject={physical:'MR Physics',parameters:'Clinical Applications',acquisition:'Clinical Applications',
    neuro:'MR Cross-Sectional Anatomy',body:'MR Cross-Sectional Anatomy',msk:'MR Cross-Sectional Anatomy',
    safety:'Bioeffects, Safety and Patient Care',care:'Bioeffects, Safety and Patient Care'};
  function add({category,id,topic,stem,options,key=[0],type='single',source, ...rest}) {
    const ref=sources[source??defaultSource[category]];
    if(!ref)throw Error('Unknown source '+source);
    bank.push({id,version:'1',category,topic,subtopic:topic,blueprint:'arrt-mri-2025-02-01',objective:rest.objective??topic,armritSubject:subject[category],stem,options,key,type,
      references:[ref],related:area[category],review:'editorial-only',...rest});
  }
  function lines(category,rows,{pilot=false}={}){
    for(const line of rows.trim().split('\n')){
      const [id,topic,source,stem,...answers]=line.split('|').map(s=>s.trim());
      const options=answers.map(pair=>pair.split('~').map(s=>s.trim()));
      add({category,id,topic,source:source||undefined,stem,options,pilot});
    }
  }
  globalThis.RegistryContent={sources,bank,add,lines};
})();
