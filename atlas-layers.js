const catalog = {
  bone:['Bones','#f1bf79'], muscle:['Muscles','#ec9b96'], tendon:['Tendons','#b7bad6'],
  ligament:['Ligaments','#e1d69a'], cartilage:['Cartilage','#71dfb8'],
  peripheral:['Peripheral nerves','#e4b98a'], central:['Central nervous system · deep structures','#aaa7f1'],
  artery:['Arteries','#ed958e'], vein:['Veins','#93b4fc'], lymph:['Lymphatic structures','#bce19f'],
  organs:['Internal organs','#f0aecb'], glands:['Glands','#eeb2ec'], skin:['Skin and subcutaneous tissues','#d7bcaf'],
  brainstem:['Brainstem','#97baff'], cerebellum:['Cerebellar gray matter and vermis','#d7a2f2'],
  white:['Cerebellar white matter','#bde9ef'], gray:['Cerebral cortex','#8ed4e6'],
  ventricle:['Ventricles','#82e7a7'], cord:['Spinal cord','#e3d99a'],
  disc:['Intervertebral disc landmarks','#e4a7ea'], cranio:['Craniovertebral landmarks','#7adae9']
};

const deep = new Set(['Accumbens Area','Amygdala','Basal Forebrain','Caudate','Hippocampus',
  'Optic Chiasm','Pallidum','Putamen','Thalamus','Ventral Diencephalon']);

function layerFor(region,label) {
  if (region==='knee') return label.name==='Femur'?'bone':'cartilage';
  if (region==='cardiac') return 'organs';
  if (region==='spine') return label.name.startsWith('Craniovertebral')?'cranio':'disc';
  const name=label.name.replace(/^(Right|Left) /,'');
  if (name.includes('Ventricle')) return 'ventricle';
  if (name==='Brainstem') return 'brainstem';
  if (name==='Cerebellum White Matter') return 'white';
  if (name.startsWith('Cerebellum')||name.startsWith('Vermal')) return 'cerebellum';
  return deep.has(name)?'central':'gray';
}

export function layerCatalog(region,labels) {
  const mappings=Object.fromEntries(Object.entries(labels).map(([id,label])=>[id,layerFor(region,label)]));
  const available=new Set(Object.values(mappings));
  const relevant=region==='brain'?['central','brainstem','cerebellum','white','gray','ventricle']
    :region==='spine'?['bone','cord','disc','cranio','peripheral','ligament']
    :region==='knee'?['bone','cartilage','muscle','tendon','ligament','peripheral']
    :['organs','artery','vein'];
  const common=['bone','muscle','tendon','ligament','cartilage','peripheral','central','artery','vein','lymph','organs','glands','skin'];
  return {mappings,groups:[...new Set([...relevant,...common])].map(id=>{
    const [name,color]=catalog[id];
    return {id,name,color,available:available.has(id)};
  })};
}
