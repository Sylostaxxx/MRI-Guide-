(() => {
  const groups=[
    ['Head and neck',[
      ['brain','Brain and cranial nerves','Cortex and deep nuclei; ventricles and CSF; brainstem and cerebellum; major cranial nerve pathways.','brain','brainstem'],
      ['face','Face, orbits and skull base','Globe and optic nerve; extraocular muscles; paranasal sinuses; skull base foramina; temporal bones.'],
      ['neck','Neck','Pharynx and larynx; thyroid; salivary glands; carotid and jugular spaces; cervical lymph nodes.']]],
    ['Spine and trunk',[
      ['cervical','Cervical spine','Vertebral bodies and discs; spinal cord; neural foramina; craniocervical junction.','spine','cervical'],
      ['thoracic','Thoracic spine','Vertebral bodies and discs; posterior elements; spinal cord and canal. The MRI pack includes only the upper thoracic portion.','spine'],
      ['lumbar','Lumbar spine','Discs; facet joints; lateral recesses; foramina; conus and cauda equina.'],
      ['sacrum','Sacrum and SI joints','Sacral segments and foramina; bilateral sacroiliac joints; adjacent iliac and sacral marrow.'],
      ['chest','Chest and lungs','Ribs and sternum; pleura and lungs; mediastinum; diaphragm; chest wall and breast.','','lungs'],
      ['heart','Heart and great vessels','Cardiac chambers; valves; septa; outflow tracts and great vessels. The MRI pack is limited to the left atrial region.','cardiac','heart'],
      ['abdomen','Abdomen','Liver and biliary tree; pancreas; spleen; kidneys and adrenals; bowel; aorta and vena cava.','','liver'],
      ['pelvis','Pelvis','Bladder and rectum; reproductive organs; pelvic floor; pelvic bones and neurovascular structures.','','uterus']]],
    ['Upper limb',[
      ['shoulder','Shoulder and girdle','Clavicle, scapula and proximal humerus; rotator cuff; glenoid labrum; biceps tendon.'],
      ['arm','Upper arm','Humeral shaft; anterior and posterior compartments; brachial artery; radial, median and ulnar nerves.','','humerus'],
      ['elbow','Elbow','Trochlea and capitulum; radial head; olecranon; collateral ligaments; distal biceps and triceps.','','humerus'],
      ['forearm','Forearm','Radius and ulna; interosseous membrane; flexor and extensor compartments; radial and ulnar vessels.','','forearm-bones'],
      ['wrist','Wrist','Distal radius and ulna; eight carpals; TFCC; carpal tunnel and Guyon canal.','','carpal-tunnel','hand'],
      ['hand','Hand and fingers','Explore the wrist bones, palm, fingers, tendons and nerves.','','hand-bones','hand']]],
    ['Lower limb',[
      ['hip','Hip and pelvis','Acetabulum and labrum; femoral head and neck; trochanters; gluteal and iliopsoas tendons.','','femur','','hip'],
      ['thigh','Thigh and femur','Femoral shaft; anterior quadriceps, medial adductors and posterior hamstrings; sciatic nerve and femoral vessels.','','quadriceps','','thigh'],
      ['knee','Knee','Distal femur, proximal tibia, patella and fibula; ligaments, menisci and extensor mechanism. MRI masks are available for femur and femoral cartilage.','knee','knee','','knee'],
      ['leg','Lower leg','Tibial and fibular shafts; anterior, lateral and posterior compartments; deep neurovascular bundles.','','leg-bones','','leg'],
      ['ankle','Ankle and hindfoot','Ankle mortise; talus and calcaneus; syndesmosis; ligaments, tendons and tarsal tunnel.','','foot-bones','','ankle'],
      ['foot','Foot and toes','Hindfoot, midfoot and forefoot; tarsals, metatarsals, phalanges; Lisfranc complex and plantar structures.','','foot-bones','','foot']]],
    ['Skeleton and whole-body reference',[
      ['long-bones','Long bones','Compare the parts of a long bone and their MRI-relevant tissues.','','long-bone','bone'],
      ['vascular','Vessels and lymphatics','Central and peripheral arteries; deep and superficial veins; lymph nodes and lymphatic pathways.','','lymph'],
      ['soft-tissues','Skin and superficial soft tissues','Epidermis, dermis, subcutaneous fat, fascia and superficial neurovascular structures.','','skin']]]
  ];
  const breakdown={
    hand:[
      ['Wrist bones','The proximal row is the scaphoid, lunate, triquetrum and pisiform. The distal row is the trapezium, trapezoid, capitate and hamate.'],
      ['Palm and digits','Metacarpals I–V form the palm. The fingers have proximal, middle and distal phalanges. The thumb has proximal and distal phalanges.'],
      ['Joints','Follow each digit from its carpometacarpal joint to the metacarpophalangeal and interphalangeal joints.'],
      ['Soft tissues','Review flexor tendons and pulleys, dorsal extensor mechanisms, volar plates, intrinsic muscles and digital neurovascular bundles.']
    ],
    'long-bones':[
      ['Bone ends and shaft','Epiphyses are the ends; metaphyses are the widened transitions; the diaphysis is the shaft. The physis is the growth plate in skeletally immature bones.'],
      ['Tissues','Compare cortical bone, trabecular bone and marrow, articular cartilage, periosteum and endosteum.'],
      ['Upper limb','Humerus in the upper arm; radius and ulna in the forearm. Metacarpals and phalanges are also long bones.'],
      ['Lower limb','Femur in the thigh; tibia and fibula in the lower leg. Metatarsals and phalanges are also long bones.']
    ]
  };
  globalThis.BodyIndex={groups};
  if(typeof document==='undefined')return;
  const el=id=>document.getElementById(id), select=el('bodyPart');
  if(!select)return;
  const rows=new Map();
  const make=(tag,value)=>{const x=document.createElement(tag);if(value)x.textContent=value;return x;};
  function anchor(label,href){const a=make('a',label);a.href=href;return a;}
  for(const [group,items] of groups){
    const optgroup=make('optgroup');optgroup.label=group;
    for(const row of items){rows.set(row[0],row);optgroup.append(new Option(row[1],row[0]));}
    select.append(optgroup);
  }
  function render(){
    const [id,title,description,pack,plate,focus,lower]=rows.get(select.value);
    el('bodyPartTitle').textContent=title;
    el('bodyPartDescription').textContent=description;
    el('bodyPartCoverage').textContent=pack?'Real MRI available in the linked atlas.':plate?'Illustrated anatomy reference. No verified MRI pack is linked for this region.':'Anatomy text reference. Verified MRI and illustrations are pending.';
    const details=el('bodyPartBreakdown');
    const items=breakdown[id]??[];
    details.replaceChildren(...items.flatMap(([name,value])=>[make('dt',name),make('dd',value)]));
    details.hidden=!items.length;
    const refs=el('bodyPartLinks');refs.replaceChildren();
    if(pack)refs.append(anchor('Open real MRI atlas','./brain-atlas.html?region='+pack));
    if(lower)refs.append(anchor('Open lower-extremity reference','./study-center.html?section=lower&region='+lower));
    if(focus)refs.append(anchor('Practice this anatomy','./practice.html?focus='+focus));
    const images=el('bodyPartImages');images.replaceChildren();
    for(const key of id==='long-bones'?['long-bone','humerus','forearm-bones','femur','leg-bones']:id==='hand'?['hand-bones','carpal-tunnel']:plate?[plate]:[]){
      const data=AnatomyPlates[key];
      if(!data)continue;
      const figure=make('figure'),img=make('img'),caption=make('figcaption');
      img.src=data.asset;img.alt=data.title;img.className='figure';img.loading='lazy';
      caption.append(anchor(data.title+' · '+data.author,data.source),' · ',anchor(data.license,data.licenseUrl));
      figure.append(img,caption);images.append(figure);
    }
  }
  function route(){
    const part=new URLSearchParams(location.search).get('part');
    select.value=rows.has(part)?part:'hand';render();
  }
  select.onchange=()=>{AppNavigation.navigate('?section=body&part='+select.value);render();};
  window.addEventListener('popstate',route);
  globalThis.BodyBrowser={route};
  route();
})();
