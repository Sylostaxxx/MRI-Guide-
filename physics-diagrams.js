(() => {
  const solutions = {
    signal:['Acquisition step',1,4,1,1],
    isotopes:['Isotope mass number',1,2,1,1],
    field:['Linear gradient (mT/m)',0,40,1,10],
    alignment:['Static field (T)',0,7,.1,1.5],
    larmor:['Static field (T)',.5,7,.1,3],
    rotation:['Ideal flip angle (degrees)',0,180,1,60],
    t1:['Sample time (ms)',0,2400,10,600],
    t2:['Sample time (ms)',0,250,1,70],
    't2-star':['Sample time (ms)',0,250,1,50],
    'k-space':['Highest retained spatial harmonic',1,31,1,9]
  };
  function draw(canvas,kind,value) {
    const c=canvas.getContext('2d'), w=canvas.width, h=canvas.height;
    const light='#e7f2fd', muted='#a8c2da', green='#83efcc', amber='#ffcf80', blue='#9cccff';
    c.clearRect(0,0,w,h);
    const text=(message,x,y,color=light,size=18)=>{
      c.font=size+'px system-ui';c.fillStyle=color;c.fillText(message,x,y);
    };
    const line=(points,color=green,width=3)=>{
      c.beginPath();c.strokeStyle=color;c.lineWidth=width;
      points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    };
    const dot=(x,y,color=green,r=5)=>{c.beginPath();c.fillStyle=color;c.arc(x,y,r,0,2*Math.PI);c.fill();};
    const arrow=(x0,y0,x1,y1,color=green)=>{
      line([[x0,y0],[x1,y1]],color,4);
      const a=Math.atan2(y1-y0,x1-x0);
      line([[x1-15*Math.cos(a-.52),y1-15*Math.sin(a-.52)],[x1,y1],
        [x1-15*Math.cos(a+.52),y1-15*Math.sin(a+.52)]],color,4);
    };
    if (kind==='signal') {
      const titles=['Excite','Encode','Receive','Reconstruct'];
      for (const [i,label] of titles.entries()) {
        const x=25+i*155;
        c.fillStyle=i+1===value?'#285249':'#203043';
        c.fillRect(x,102,133,67);
        text(label,x+8,142,i+1===value?green:light,17);
        if (i<3) arrow(x+134,134,x+151,134,muted);
      }
      text('Signal and reconstruction overview',25,46);
      return ['B1 tips a fraction of the net vector into the transverse plane.',
        'Gradients encode position in frequency and phase.',
        'The receive coil measures a time-varying voltage.',
        'Complex samples are transformed into spatial image values.'][value-1];
    }
    if (kind==='isotopes') {
      text(value===1?'Hydrogen-1 nucleus':'Hydrogen-2 nucleus (deuterium)',25,45);
      dot(value===1?310:278,146,green,45);
      text('p',value===1?304:272,153,'#0d2925',24);
      if (value===2) {dot(357,146,blue,45);text('n',350,153,'#18263a',24);}
      text('Nucleus schematic · particle sizes are illustrative',25,265,muted);
      return value===1?'One proton, zero neutrons. Routine proton MRI targets hydrogen-1.':'One proton, one neutron. Deuterium has different nuclear spin and resonance properties.';
    }
    if (kind==='alignment') {
      arrow(315,238,315,70,muted);text('B0 direction',331,64,muted);
      const relative=value/7;
      if (relative) arrow(315,238,315,238-147*relative,green);
      else dot(315,238);
      text('Relative equilibrium net vector',25,45);
      text('Approximate linear relation at fixed temperature',25,283,muted);
      return 'B0 '+value.toFixed(1)+' T. The vector shows relative M0 on this scale (7 T = 100% of the scale, not 100% spin polarization).';
    }
    if (kind==='field') {
      text('Local change relative to B0',25,42);
      line([[55,155],[595,155]],muted);
      line([[325,63],[325,253]],muted);
      line([[58,155+value*2],[592,155-value*2]],green);
      text('−10 cm',51,278,muted);text('Isocenter',277,278,muted);text('+10 cm',527,278,muted);
      text((value/10).toFixed(1)+' mT above baseline',410,68,green,15);
      return 'Gradient '+value+' mT/m. At +10 cm, ΔB = '+(value/10).toFixed(1)+' mT. At −10 cm the shift has the opposite sign.';
    }
    if (kind==='rotation' || kind==='larmor') {
      const x=310,y=168;
      arrow(x,290,x,35,muted);arrow(135,y,494,y,muted);
      text('Longitudinal axis',345,56,muted);text('Transverse projection',445,y+32,muted,15);
      if (kind==='larmor') {
        c.beginPath();c.strokeStyle=blue;c.lineWidth=2;c.ellipse(x,85,84,23,0,0,2*Math.PI);c.stroke();
        const rate=MRIPhysics.larmorMHz(value), a=rate*.012*2*Math.PI;
        const point=[x+84*Math.cos(a),85+23*Math.sin(a)];
        arrow(x,y,...point,green);
        text('Fixed-time projected phase',25,283,muted);
        return value.toFixed(1)+' T → '+rate.toFixed(2)+' MHz for protons. Cone is a schematic of precession, sampled here at 12 ns.';
      }
      const a=value*Math.PI/180, dx=109*Math.sin(a), dy=109*Math.cos(a);
      line([[x+dx,y],[x+dx,y-dy],[x,y-dy]],blue,2);
      arrow(x,y,x+dx,y-dy,green);
      return value+'°. Relative Mz '+Math.cos(a).toFixed(2)+' and transverse magnitude '+Math.sin(a).toFixed(2)+'. Ideal on-resonance rotation from equilibrium.';
    }
    const left=65,right=607,bottom=246,top=48;
    line([[left,top],[left,bottom],[right,bottom]],muted,2);
    if (kind==='k-space') {
      const harmonic=value;
      const wave = x => {
        let sum=.5;
        for (let n=1;n<=harmonic;n+=2) sum+=2*Math.sin(2*Math.PI*n*x)/(n*Math.PI);
        return sum;
      };
      const y=v=>205-v*116;
      line([[left,y(0)],[left,y(1)],[336,y(1)],[336,y(0)],[right,y(0)]],muted,2);
      line(Array.from({length:250},(_,i)=>[left+i*(right-left)/249,y(wave(i/249))]));
      text('Truncated Fourier reconstruction',65,28);
      text('Position across one period',210,284,muted);
      return 'Components retained through harmonic '+harmonic+'. The gray reference is a periodic step. The green curve approximates it and can ring at its edges.';
    }
    const t1=kind==='t1', span=t1?2400:250;
    const first=t1?600:kind==='t2'?45:80;
    const second=t1?1200:kind==='t2'?100:40;
    const model=t1?MRIPhysics.longitudinalRecovery:MRIPhysics.transverseDecay;
    const px=t=>left+(right-left)*t/span, py=f=>bottom-(bottom-top)*f;
    for (const [constant,color] of [[first,green],[second,amber]]) {
      line(Array.from({length:151},(_,i)=>{
        const t=span*i/150;
        return [px(t),py(model(t,constant))];
      }),color);
      dot(px(value),py(model(value,constant)),color);
    }
    line([[px(value),top],[px(value),bottom]],blue,1);
    text('1.0',24,top+6,muted);text('0',43,bottom+6,muted);
    text(t1?'Normalized longitudinal recovery':'Normalized transverse signal',65,28);
    text('0',65,275,muted);text(span+' ms',548,275,muted);
    const firstName=kind==='t2-star'?'T2':'Time constant';
    const secondName=kind==='t2-star'?'T2*':'Time constant';
    return 'At '+value+' ms, '+firstName+' '+first+' ms (green) gives '+(100*model(value,first)).toFixed(1)+'%; '+
      secondName+' '+second+' ms (amber) gives '+(100*model(value,second)).toFixed(1)+'%. Simplified exponential model.';
  }
  globalThis.PhysicsDiagrams={solutions,draw};
})();
