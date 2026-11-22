(() => {
  const base = 'https://med.stanford.edu/bmrgroup/education/mri-physics.html#main_panel_builder_panel_0_video';
  const stanford = (title,section,description,difficulty) => ({
    title,creator:'Stanford Medicine · Body MRI Research Group',url:base+section,
    description,difficulty,language:'English',verified:'2026-11-22'
  });
  const overview=stanford('Overview of MRI','','Overview of excitation, image formation, contrast and SNR.','Beginner');
  const hardware=stanford('MRI Hardware Overview','_0','Main field, RF transmit and receive fields, and gradients.','Beginner');
  const excitation=stanford('MRI Signal Excitation','_1','Rotation around transverse fields, the rotating frame, and selective excitation.','Intermediate');
  const contrast=stanford('MRI Contrast','_4','Relaxation, T1 and T2 contrast, and how preparation changes visible signal.','Intermediate');
  const encoding=stanford('MRI Image Formation','_2','Spatial frequency, gradient encoding and formation of the image.','Intermediate');
  const sequences=stanford('MRI Sequences Overview','_5','Timing and the different refocusing mechanisms of spin and gradient echoes.','Intermediate');
  const tutorial = (description,seconds) => ({title:'MRI physics made easy!',creator:'The Neuroradiologist',
    url:'https://www.youtube.com/watch?v=oVJH68xjVBA&t='+seconds+'s',provider:'YouTube',
    description,difficulty:'Beginner',language:'English',verified:'2026-11-22'});
  globalThis.PhysicsVideos = {
    foundations:[overview],hydrogen:[tutorial('Basic MRI physics and proton magnetic moments.',80)],
    magnetism:[hardware],alignment:[tutorial('Effect of the external magnetic field and the net vector.',355)],
    larmor:[tutorial('Precession, resonance and coherent phase.',1084)],rf:[excitation],
    'flip-angle':[excitation],t1:[contrast,tutorial('Longitudinal recovery and T1.',1472)],
    t2:[contrast,tutorial('Transverse relaxation and T2.',1675)],
    't2-star':[sequences,tutorial('Comparison of T2 and T2* decay.',2190)],'k-space':[encoding]
  };
})();
