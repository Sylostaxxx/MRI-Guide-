(() => {
  const {views,stack,intersection} = PlannerGeometry;
  const el = id => document.getElementById(id);
  const packs = {
    brain: ['atlas/manifest.json','mri-brain-atlas-cerebra-1'],
    cspine: ['atlas/spine/manifest.json','mri-spine-atlas-1',5],
    knee: ['atlas/knee/manifest.json','mri-knee-atlas-1',2]
  };
  const settings = ['planCount','planThickness','planGap','planSlice','planPhase','planSat'];
  const defaults = ['15','4','1','8','along','0'];
  let region, plane, image, center, cursor, spacing, origin, revision=0, drag;
  const panels = [];

  function state() {
    return {
      angle: Number(el('angle').value), fov: Number(el('fov').value),
      count: Number(el('planCount').value), thickness: Number(el('planThickness').value),
      gap: Number(el('planGap').value), selected: Number(el('planSlice').value),
      phase: el('planPhase').value, saturation: Number(el('planSat').value)
    };
  }

  function present(message, fallback=false) {
    el('plannerSource').textContent=message;
    el('screen').hidden=!fallback;
    el('schematicOffset').hidden=!fallback;
    el('realPlanning').hidden=fallback;
    el('planViews').hidden=!image;
    el('planControls').hidden=!image;
    el('planRetry').hidden=true;
  }

  async function load() {
    const token=++revision, pack=packs[region];
    image=null; drag=null;
    if (!pack) {
      present('Schematic fallback · no verified MRI pack for this anatomy',true);
      return;
    }
    present('Loading real MRI localizers…');
    try {
      const archive = await caches.open(pack[1]).catch(()=>null);
      const cache = await caches.open('mri-planner-volumes-1').catch(()=>null);
      async function get(path) {
        const saved = await archive?.match(path) ?? await cache?.match(path);
        if (saved) return saved;
        const response = await fetch(path);
        if (!response.ok) throw Error('MRI pack unavailable');
        return response;
      }
      const manifestResponse=await get(pack[0]);
      const manifest=await manifestResponse.clone().json();
      const asset=manifest.volumes[0], response=await get(asset.path);
      const data=await response.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',data);
      const hash=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
      if (data.byteLength!==asset.bytes || hash!==asset.sha256) throw Error('MRI file failed its integrity check');
      const volume=await Nifti.parse(data);
      Nifti.verifyAtlasGrid(volume,volume);
      let offline=false;
      if (cache) {
        try {
          await cache.put(asset.path,new Response(data));
          await cache.put(pack[0],manifestResponse);
          offline=true;
        } catch {}
      }
      if (token!==revision) return;
      image=volume;
      spacing=[0,1,2].map(axis=>image.affine[axis*5]);
      origin=[0,1,2].map(axis=>image.affine[axis*4+3]);
      cursor=pack[2] ? [...manifest.anchors[pack[2]]] : image.dim.map(n=>Math.floor(n/2));
      center=cursor.map((index,axis)=>origin[axis]+index*spacing[axis]);
      for (const panel of panels) panel.index=null;
      present(manifest.sequence+' · '+(offline ? 'Available offline' : 'Loaded for this session'));
      draw();
    } catch {
      if (token!==revision) return;
      present('Schematic fallback · real MRI could not load. Connect to download the reference.',true);
      el('planRetry').hidden=false;
    }
  }

  function draw() {
    if (!image) return;
    const slider=el('planSlice'), count=Number(el('planCount').value);
    if (Number(slider.value)>count) slider.value=count;
    slider.max=count;
    const plan=state(), frame=stack(plane,plan.angle,plan.count,plan.thickness,plan.gap);
    el('planCoverage').textContent=frame.coverage.toFixed(1)+' mm coverage · slice '+plan.selected+' of '+plan.count;
    el('planCenter').textContent='Stack center (RAS mm) '+center.map(n=>n.toFixed(1)).join(', ');
    for (const panel of panels) renderPanel(panel,plan,frame);
  }

  function renderPanel(panel,plan,frame) {
    const {axis,u,v}=panel.view, {canvas}=panel;
    const w=image.dim[u],h=image.dim[v];
    if (panel.index!==cursor[axis]) {
      const slice=panel.slice;
      slice.width=w;slice.height=h;
      const ctx=slice.getContext('2d'), pixels=ctx.createImageData(w,h), point=cursor.slice();
      const range=Math.max(1,image.hi-image.lo);
      for (let y=0;y<h;y++) {
        point[v]=h-1-y;
        for (let x=0;x<w;x++) {
          point[u]=x;
          const value=255*(image.p[Nifti.voxelIndex(image.dim,point)]-image.lo)/range;
          const i=4*(y*w+x);
          pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
        }
      }
      ctx.putImageData(pixels,0,0);
      panel.index=cursor[axis];
    }
    const height=Math.round(420*h*spacing[v]/(w*spacing[u]));
    canvas.width=420;canvas.height=height;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(panel.slice,0,0,canvas.width,canvas.height);
    const project=([x,y])=>[
      ((x-origin[u])/spacing[u]+.5)*canvas.width/w,
      (h-.5-(y-origin[v])/spacing[v])*canvas.height/h
    ];
    const world=cursor.map((index,i)=>origin[i]+index*spacing[i]);
    function line(points,color,width=1) {
      if (points.length<2) return;
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
      points.forEach((point,i)=>i?ctx.lineTo(...project(point)):ctx.moveTo(...project(point)));
      ctx.stroke();
    }
    const [cx,cy]=project([world[u],world[v]]);
    ctx.strokeStyle='#c4c4c499';ctx.lineWidth=1;ctx.beginPath();
    ctx.moveTo(cx,0);ctx.lineTo(cx,height);ctx.moveTo(0,cy);ctx.lineTo(canvas.width,cy);ctx.stroke();
    for (const [index,position] of frame.positions.entries()) {
      const selected=index===plan.selected-1;
      const color=selected?'#ffe060':'#56dfc5';
      line(intersection(panel.view,world[axis],center,frame,position,plan.fov),color,selected?3:1);
      if (selected) {
        for (const edge of [-1,1]) line(intersection(panel.view,world[axis],center,frame,
          position+edge*plan.thickness/2,plan.fov),'#ffe06088');
      }
    }
    // The saturation slab sits above the stack along the prescription normal.
    if (plan.saturation) {
      for (const edge of [4,4+plan.saturation]) {
        line(intersection(panel.view,world[axis],center,frame,frame.coverage/2+edge,plan.fov),'#fc92db',2);
      }
    }
    const phase=plan.phase==='along'?frame.along:frame.across;
    const length=Math.hypot(phase[u],phase[v]);
    if (length>0.01) {
      const x=45*phase[u]/length,y=-45*phase[v]/length;
      ctx.strokeStyle='#9bcaff';ctx.fillStyle='#9bcaff';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(55-x/2,height-28-y/2);ctx.lineTo(55+x/2,height-28+y/2);ctx.stroke();
      ctx.font='bold 15px system-ui';ctx.fillText('PHASE',24,height-8);
    }
    ctx.font='bold 17px system-ui';ctx.fillStyle='#fff';
    const [top,bottom,left,right]=panel.view.edges;
    ctx.fillText(top,203,21);ctx.fillText(bottom,203,height-8);
    ctx.fillText(left,7,height/2);ctx.fillText(right,402,height/2);
    panel.slider.max=image.dim[axis]-1;panel.slider.value=cursor[axis];
    panel.caption.textContent=(cursor[axis]+1)+' / '+image.dim[axis];
  }

  for (const [name,view] of Object.entries(views)) {
    const panel=document.createElement('div');
    const label=name[0].toUpperCase()+name.slice(1);
    panel.innerHTML='<strong>'+label+'</strong><canvas role="img" aria-label="'+label+
      ' MRI planning localizer"></canvas><label>'+label+' localizer slice <span></span><input type="range" min="0"></label>';
    el('planViews').append(panel);
    const canvas=panel.querySelector('canvas'),slider=panel.querySelector('input');
    panels.push({view,canvas,slider,caption:panel.querySelector('span'),slice:document.createElement('canvas')});
    slider.setAttribute('aria-label',label+' localizer slice');
    slider.oninput=()=>{cursor[view.axis]=Number(slider.value);draw();};
    function point(event) {
      const rect=canvas.getBoundingClientRect();
      const value=cursor.slice();
      value[view.u]=Math.max(0,Math.min(image.dim[view.u]-1,Math.floor((event.clientX-rect.left)*image.dim[view.u]/rect.width)));
      value[view.v]=Math.max(0,Math.min(image.dim[view.v]-1,image.dim[view.v]-1-Math.floor((event.clientY-rect.top)*image.dim[view.v]/rect.height)));
      return value;
    }
    canvas.onpointerdown=event=>{
      if (!event.isPrimary || !image) return;
      const from=point(event);
      drag={canvas,id:event.pointerId,from,start:center.slice(),moved:false};
      canvas.setPointerCapture(event.pointerId);
    };
    canvas.onpointermove=event=>{
      if (!drag || drag.canvas!==canvas || drag.id!==event.pointerId) return;
      const to=point(event);
      if (to.some((value,i)=>value!==drag.from[i])) drag.moved=true;
      if (!drag.moved) return;
      center=drag.start.map((value,i)=>Math.max(origin[i],Math.min(origin[i]+(image.dim[i]-1)*spacing[i],
        value+(to[i]-drag.from[i])*spacing[i])));
      draw();
    };
    canvas.onpointerup=event=>{
      if (!drag || drag.canvas!==canvas || drag.id!==event.pointerId) return;
      if (!drag.moved) cursor=point(event);
      drag=null;draw();
    };
    canvas.onpointercancel=()=>{drag=null;};
  }
  settings.forEach(id=>el(id).addEventListener('input',draw));
  el('planRetry').onclick=load;
  globalThis.RealPlanner = {
    update(anatomy,prescription) {
      plane=prescription;
      if (region!==anatomy) { region=anatomy;load(); } else draw();
    },
    reset() {
      settings.forEach((id,i)=>{el(id).value=defaults[i];});
      if (image) center=cursor.map((index,i)=>origin[i]+index*spacing[i]);
    },
    summary() {
      if (!image) return '';
      const s=state(),f=stack(plane,s.angle,s.count,s.thickness,s.gap);
      return 'Real MRI · '+s.count+' slices × '+s.thickness+' mm · '+s.gap+' mm gap · '+f.coverage.toFixed(1)+
        ' mm coverage · selected slice '+s.selected+' · '+s.phase+' phase axis · saturation '+s.saturation+
        ' mm · center RAS '+center.map(v=>v.toFixed(1)).join(', ')+' mm.';
    }
  };
})();
