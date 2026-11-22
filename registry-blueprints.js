(() => {
  const categories = {
    physical: ['Physical principles of image formation',40],
    parameters: ['Sequence parameters and options',36],
    acquisition: ['Data acquisition, processing, and storage',30],
    neuro: ['Neurological procedures',25],
    body: ['Body procedures',15],
    msk: ['Musculoskeletal procedures',17],
    safety: ['MRI screening and safety',21],
    care: ['Patient interactions and management',16]
  };
  const blueprint = {
    id:'arrt-mri-2025-02-01', effective:'2025-02-01', total:230, scored:200,
    pilot:30, minutes:230, tutorialMinutes:8, categories,
    formats:['single','multiple','order'],
    sources:{
      outline:'https://assets-us-01.kc-usercontent.com/406ac8c6-58e8-00b3-e3c1-0c312965deb2/8a6d78b2-c8bf-4a57-b824-85a9bc5a98e5/Magnetic%20Resonance%20Imaging%20Content%20Specifications%202025.pdf',
      prep:'https://www.arrt.org/pages/earn-arrt-credentials/initial-requirements/exam/preparing-for-your-exam',
      formats:'https://www.arrt.org/pdfs/examination/computer-based-testing-overview.pdf'
    }
  };
  const armrit = {
    id:'armrit-mri-2026-03-15', total:225, minutes:210, formats:['single'],
    subjects:['MR Physics','Clinical Applications','Bioeffects, Safety and Patient Care','MR Cross-Sectional Anatomy'],
    source:'https://armrit.org/pdf/APP03152026.pdf'
  };
  globalThis.RegistryBlueprints={arrt:blueprint,armrit};
})();
