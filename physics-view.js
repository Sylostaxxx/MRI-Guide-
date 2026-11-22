(() => {
 const get = id => document.getElementById(id);
function drawRelaxation(tr,te) {
 const {longitudinalRecovery,transverseDecay,spinEchoSignal}=MRIPhysics;
 const canvas=get('relaxationPlot'),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.font='15px system-ui';
 function graph(left, name, maximum, marker, curves) {
  const width=255,top=28,height=143;
  ctx.fillStyle='#eaf2fa';ctx.fillText(name,left,19);
  ctx.strokeStyle='#74869b';ctx.lineWidth=1;
  ctx.strokeRect(left,top,width,height);
  ctx.fillText('1',left-16,top+8);ctx.fillText('0',left-16,top+height);
  ctx.fillText('0',left,195);ctx.fillText(maximum+' ms',left+width-65,195);
  const mx=left+width*marker/maximum;
  ctx.beginPath();ctx.moveTo(mx,top);ctx.lineTo(mx,top+height);ctx.stroke();
  curves.forEach(([label,color,fn],series)=>{
   ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.beginPath();
   for(let x=0;x<=width;x++){
    const y=top+height*(1-fn(maximum*x/width));
    if(x===0)ctx.moveTo(left,y);else ctx.lineTo(left+x,y);
   }
   ctx.stroke();ctx.fillText(label,left+136+series*58,19);
  });
 }
 graph(27,'Recovery · TR',5000,tr,[['T1','#79e3c6',time=>longitudinalRecovery(time,850)]]);
 graph(337,'Decay · TE',150,te,[['T2','#82b9ff',time=>transverseDecay(time,75)],['T2*','#ffca83',time=>transverseDecay(time,45)]]);
 const signal=spinEchoSignal(tr,te,850,75);
 get('relaxationSummary').textContent='At TR '+tr+' ms and TE '+te+' ms, modeled white-matter spin-echo signal is '+(signal*100).toFixed(1)+'% of equilibrium magnetization.';
}
function updateLarmor(){
 const field=Number(get('sField').value);
 get('larmor').textContent='Proton Larmor frequency at '+field+' T is '+MRIPhysics.larmorMHz(field).toFixed(2)+' MHz.';
}
 get('sField').addEventListener('change',updateLarmor);
 updateLarmor();
 globalThis.MRIPhysicsView = {drawRelaxation};
})();
