(() => {
  // Each variant has its own stable ID and stable answer-option indexes.
  // These generated items stay outside the authored bank and exam pools.
  const fields = [
    ['one',1,42.58],['two',2,85.16],['four',4,170.32],['seven',7,298.06]
  ];
  const variants = fields.map(([id,field,expected]) => ({
    id:'larmor-field-'+id,version:'1',family:'larmor-field',
    category:'physical',topic:'Larmor frequency',subtopic:'Proton resonance calculations',
    blueprint:'arrt-mri-2025-02-01',armritSubject:'MR Physics',
    difficulty:'Advanced',type:'single',key:[0],studyOnly:true,
    stem:'At '+field+' T, calculate the approximate proton Larmor frequency. Use 42.58 MHz/T.',
    options:[
      [(42.58*field).toFixed(2)+' MHz','Multiply field strength in tesla by the proton gyromagnetic ratio in MHz/T.'],
      [(42.58*field/2).toFixed(2)+' MHz','This is the frequency at half the given field strength.'],
      [(42.58*field*2).toFixed(2)+' MHz','This is the frequency at twice the given field strength.'],
      [(42.58*field*0.001).toFixed(2)+' MHz','This scales the MHz result by an unnecessary factor of a thousand.']
    ],
    formula:{name:'larmor',args:[field],digits:2,expected},expected,related:'./academy.html?lesson=larmor',references:[RegistryContent.sources.physics]
  }));
  globalThis.StudyVariants={variants};
})();
