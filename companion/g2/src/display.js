import {TextContainerUpgrade,ImageRawDataUpdate} from '@evenrealities/even_hub_sdk';

const rows=[
  {key:'heading',containerID:1,containerName:'heading',yPosition:8,height:34,textColor:4,isEventCapture:0},
  {key:'body',containerID:2,containerName:'study',yPosition:51,height:155,textColor:4,isEventCapture:1},
  {key:'footer',containerID:3,containerName:'actions',yPosition:211,height:68,textColor:3,isEventCapture:0}
];
const image={xPosition:167,yPosition:60,width:242,height:133,containerID:4,containerName:'curve'};
export function layout(frame) {
  const textObject=rows.map(({key,...row})=>({
    ...row,xPosition:14,width:548,paddingLength:3,content:frame[key]||' '
  }));
  return {containerTotalNum:frame.diagram?4:3,textObject,...(frame.diagram?{imageObject:[image]}:{})};
}
function picture(kind) {
  const canvas=document.createElement('canvas');
  canvas.width=image.width;canvas.height=image.height;
  const c=canvas.getContext('2d');
  c.fillStyle='#000';c.fillRect(0,0,canvas.width,canvas.height);
  const x=14,y=114,w=217,h=103;
  c.strokeStyle='#aaa';c.lineWidth=2;c.beginPath();c.moveTo(x,6);c.lineTo(x,y);c.lineTo(x+w,y);c.stroke();
  c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();
  for(let i=0;i<=w;i++) {
    const t=i*4/w, fraction=kind==='t1'?1-Math.exp(-t):Math.exp(-t);
    if(i) c.lineTo(x+i,y-h*fraction);else c.moveTo(x,y-h*fraction);
  }
  c.stroke();
  return canvas.toDataURL('image/png').split(',')[1];
}
export function makeDisplay(bridge) {
  let previous=null;
  return async(frame,{refresh=false}={})=>{
    if (!previous) {
      const result=await bridge.createStartUpPageContainer(layout(frame));
      if(result!==0)throw Error('Glasses startup failed ('+result+').');
    } else if (refresh || previous.diagram!==frame.diagram) {
      if(!await bridge.rebuildPageContainer(layout(frame)))throw Error('Could not redraw glasses.');
    } else {
      for(const {key,containerID,containerName} of rows) {
        if(previous[key]===frame[key])continue;
        if(!await bridge.textContainerUpgrade(new TextContainerUpgrade({containerID,containerName,content:frame[key]||' '}))) {
          throw Error('Glasses text update failed.');
        }
      }
    }
    const sendImage=frame.diagram && (refresh || previous?.diagram!==frame.diagram);
    previous=frame;
    if (sendImage) {
      const result=await bridge.updateImageRawData(new ImageRawDataUpdate({containerID:image.containerID,
        containerName:image.containerName,imageData:picture(frame.diagram)}));
      if(result!=='success')throw Error('Curve image was not accepted ('+result+').');
    }
  };
}
