(() => {
  const loaded = new Map();
  const disabled = Object.freeze([]);
  const markerWords = /indicated by|highlighted by|which disc level|which structure is labeled|marked anatomical region|numbered marker|outline|marker dot|marked by|highlighted structure/i;
  const missingVisual = /(?:indicated|marked|highlighted) by (?:an? |the )?(?:arrow|marker|outline)|(?:in|on) (?:the|this) (?:image|scan|localizer|illustration)|which (?:structure|disc level) is (?:labeled|indicated|marked)/i;
  function valid(question,asset=globalThis.RegistryImages?.[question.image]) {
    if (!question.image) return !missingVisual.test(question.stem);
    if(disabled.includes(question.id))return false;
    if (!asset || asset.questionId!==question.id || (asset.verification!=='source-verified') ||
      !Object.hasOwn(asset,'marker') || !/^https:\/\//.test(asset.source) || !asset.license || !asset.attribution ||
      !/^https:\/\//.test(asset.licenseUrl) || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !/^\d{4}-\d\d-\d\d$/.test(asset.reviewed) || !asset.sequence || !asset.plane ||
      !/^\.\/atlas\/registry\/[\w-]+\.webp$/.test(asset.path) ||
      !Number.isInteger(asset.width) || !Number.isInteger(asset.height) ||
      asset.width<240 || asset.height<150 || asset.width>2000 || asset.height>2000 ||
      question.key?.length!==1 || question.options?.[question.key[0]]?.[0]!==asset.expectedAnswer) return false;
    if(asset.comparison){
      const other=globalThis.RegistryImages?.[asset.comparison];
      if(!other||other.comparison||other.region!==asset.region||other.plane===asset.plane||!valid(comparisonQuestion(other),other))return false;
    }
    if (!asset.marker) return !asset.marked && !markerWords.test(question.stem);
    const {type,target,origin,number,segments}=asset.marker;
    const within=(position,edge=false)=>Array.isArray(position)&&position.length===2&&position.every((value,index)=>{
      const maximum=index?asset.height:asset.width;
      return Number.isFinite(value)&&value>=0&&(edge?value<=maximum:value<maximum);
    });
    if(!asset.marked||!within(target)||!within(origin)||Math.hypot(target[0]-origin[0],target[1]-origin[1])<25)return false;
    if(type==='number')return Number.isInteger(number)&&number>=1&&number<=99;
    if(type==='segmentation')return Array.isArray(segments)&&segments.length>0&&segments.length<=5000&&
      segments.every(pair=>Array.isArray(pair)&&pair.length===4&&within(pair.slice(0,2),true)&&within(pair.slice(2),true));
    return ['arrow','dot','hotspot'].includes(type);
  }
  function comparisonQuestion(asset){
    return {id:asset.questionId,image:asset.questionId,stem:'',key:[0],options:[[asset.expectedAnswer]]};
  }
  async function ready(question) {
    if(!valid(question))return Promise.resolve(false);
    if(!question.image||typeof Image==='undefined')return Promise.resolve(true);
    const asset=RegistryImages[question.image];
    if(!loaded.has(asset.path)){
      const image=new Image();
      const result=new Promise(resolve=>{
        const timeout=setTimeout(()=>resolve(false),8000);
        image.onload=()=>{
          clearTimeout(timeout);
          resolve([image.naturalWidth,image.naturalHeight]);
        };
        image.onerror=()=>{clearTimeout(timeout);resolve(false);};
        image.src=asset.path;
      });
      loaded.set(asset.path,result);
      result.then(ok=>{if(!ok)loaded.delete(asset.path);});
    }
    const size=await loaded.get(asset.path);
    return Boolean(size&&size[0]===asset.width&&size[1]===asset.height)&&(!asset.comparison||await ready(comparisonQuestion(RegistryImages[asset.comparison])));
  }
  async function available(questions) {
    const checks=await Promise.all(questions.map(ready));
    return questions.filter((_,index)=>checks[index]);
  }
  function paint(canvas,asset,revealed) {
    canvas.width=asset.width;canvas.height=asset.height;
    const m=asset.marker;
    if(!m)return;
    const c=canvas.getContext('2d');
    const [x,y]=m.target,[ox,oy]=m.origin;
    const angle=Math.atan2(y-oy,x-ox),ux=Math.cos(angle),uy=Math.sin(angle);
    const color=revealed?'#ffdf51':'#fff';
    c.lineJoin='round';c.lineCap='round';
    function stroke(trace,width){
      for(const [ink,weight] of [['#060606',width+6],[color,width]]){
        c.beginPath();trace();c.strokeStyle=ink;c.lineWidth=weight;c.stroke();
      }
    }
    const circle=(cx,cy,r)=>{c.moveTo(cx+r,cy);c.arc(cx,cy,r,0,Math.PI*2);};
    if(m.type==='segmentation'){
      stroke(()=>{for(const [a,b,d,e] of m.segments){c.moveTo(a,b);c.lineTo(d,e);}},revealed?2.6:1.6);
      return;
    }
    if(m.type==='hotspot'){
      stroke(()=>circle(x,y,14),4);
      return;
    }
    const end=m.type==='arrow'?11:6;
    stroke(()=>{c.moveTo(ox,oy);c.lineTo(x-end*ux,y-end*uy);},6);
    if(m.type==='arrow'){
      // Filled triangular arrowhead with its apex at the exact source voxel.
      const back=24,half=10;
      c.beginPath();c.moveTo(x,y);
      c.lineTo(x-back*ux-half*uy,y-back*uy+half*ux);
      c.lineTo(x-back*ux+half*uy,y-back*uy-half*ux);
      c.closePath();c.strokeStyle='#060606';c.lineWidth=5;c.stroke();c.fillStyle=color;c.fill();
    }else{
      stroke(()=>circle(x,y,5),4);
      if(m.type==='number'){
        c.beginPath();circle(ox,oy,16);c.fillStyle='#090909';c.fill();
        c.strokeStyle=color;c.lineWidth=3;c.stroke();
        c.fillStyle=color;c.font='bold 19px sans-serif';c.textAlign='center';c.textBaseline='middle';
        c.fillText(String(m.number),ox,oy);
      }
    }
  }
  function mount(image,question,{revealed=false,zoom=1}={}) {
    const frame=image.parentElement;
    const canvas=frame.querySelector('canvas');
    const status=frame.parentElement.querySelector('.marker-load-status');
    const asset=question?.image&&RegistryImages[question.image];
    if(!asset||!valid(question,asset)){
      image.removeAttribute('src');canvas.hidden=true;
      if(status)status.textContent=question?.image?'This MRI question has an unresolved image reference.':'';
      return;
    }
    if(frame.dataset.asset!==asset.questionId && status)status.textContent='';
    frame.dataset.asset=asset.questionId;
    image.onload=()=>{if(status)status.textContent='';};
    image.onerror=()=>{if(status)status.textContent='This MRI image did not load. Skip this item or reload the image pack.';};
    if(image.getAttribute('src')!==asset.path)image.src=asset.path;
    if(image.complete&&!image.naturalWidth&&status)status.textContent='This MRI image did not load. Skip this item or reload the image pack.';
    canvas.hidden=!asset.marker;
    if(canvas.dataset.key!==asset.questionId+':'+revealed){
      paint(canvas,asset,revealed);
      canvas.dataset.key=asset.questionId+':'+revealed;
      if(asset.marker){
        canvas.dataset.marker=asset.marker.type;
        canvas.dataset.target=asset.marker.target.join(',');
      }else{delete canvas.dataset.marker;delete canvas.dataset.target;}
    }
    frame.style.setProperty('--image-viewport',Math.round(51*asset.width/asset.height)+'vh');
    frame.style.setProperty('--image-zoom',zoom);
    const scroll=frame.parentElement;
    if(!scroll.classList.contains('comparison-panel')){
      scroll.classList.toggle('has-comparison',Boolean(asset.comparison)&&zoom===1);
      let comparison=scroll.querySelector('.comparison-panel');
      if(asset.comparison){
        if(!comparison){
          comparison=document.createElement('div');comparison.className='comparison-panel';
          const second=layout(comparison);
          second.alt='MRI Image B for this question';
          scroll.append(comparison);
        }
        frame.dataset.panel='Image A';
        image.alt='MRI Image A for this question';
        mount(comparison.querySelector('img'),comparisonQuestion(RegistryImages[asset.comparison]),{revealed,zoom});
        comparison.querySelector('.registered-image').dataset.panel='Image B';
      }else{
        comparison?.remove();delete frame.dataset.panel;
        image.alt='MRI for this question';
      }
    }
  }
  function enablePinch(root,zoom){
    let gesture=null;
    const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
    root.addEventListener('touchstart',event=>{
      if(event.touches.length===2)gesture={distance:distance(event.touches),zoom:Number(zoom.value)};
    },{passive:true});
    root.addEventListener('touchmove',event=>{
      if(!gesture?.distance||event.touches.length!==2)return;
      if(event.cancelable)event.preventDefault();
      const step=Number(zoom.step);
      const value=Math.round(gesture.zoom*distance(event.touches)/gesture.distance/step)*step;
      zoom.value=Math.max(Number(zoom.min),Math.min(Number(zoom.max),value));
      zoom.dispatchEvent(new Event('input',{bubbles:true}));
    },{passive:false});
    root.addEventListener('touchend',event=>{if(event.touches.length<2)gesture=null;});
    root.addEventListener('touchcancel',()=>{gesture=null;});
  }
  function layout(root,imageId) {
    const wrapper=document.createElement('div');wrapper.className='registered-image';
    const image=document.createElement('img');image.alt='MRI for this question';
    if(imageId)image.id=imageId;
    const canvas=document.createElement('canvas');canvas.className='mri-marker';canvas.setAttribute('aria-hidden','true');
    const status=document.createElement('p');status.className='marker-load-status';status.setAttribute('role','status');
    wrapper.append(image,canvas);
    root.append(wrapper,status);
    return image;
  }
  globalThis.RegistryImageView={disabled,valid,ready,available,paint,mount,layout,enablePinch};
})();
