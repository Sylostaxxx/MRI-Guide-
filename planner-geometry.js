(() => {
  const views = {
    axial: { axis: 2, u: 0, v: 1, edges: 'APLR' },
    sagittal: { axis: 0, u: 1, v: 2, edges: 'SIPA' },
    coronal: { axis: 1, u: 0, v: 2, edges: 'SILR' }
  };
  const dot = (a,b) => a.reduce((sum,value,i) => sum+value*b[i],0);
  function stack(plane, degrees, count, thickness, gap) {
    const {axis,u,v} = views[plane];
    const angle = degrees*Math.PI/180;
    const normal = [0,0,0], along = [0,0,0], across = [0,0,0];
    normal[axis]=Math.cos(angle);normal[u]=Math.sin(angle);
    along[axis]=-Math.sin(angle);along[u]=Math.cos(angle);
    across[v]=1;
    const positions=Array.from({length:count},(_,i)=>(i-(count-1)/2)*(thickness+gap));
    return {normal,along,across,positions,coverage:count*thickness+(count-1)*gap};
  }

  // Intersect the prescribed square with a coordinate-plane localizer.
  function intersection(view, reference, center, frame, offset, fov) {
    const {axis,u,v} = view;
    const origin = center.map((value,i)=>value+frame.normal[i]*offset);
    const a=frame.along[axis],b=frame.across[axis],c=reference-origin[axis];
    if (Math.abs(a)+Math.abs(b)<1e-8) {
      if (Math.abs(c)>1e-6) return [];
      const h=fov/2;
      return [[-h,-h],[h,-h],[h,h],[-h,h],[-h,-h]].map(([s,t])=>
        [origin[u]+frame.along[u]*s+frame.across[u]*t,origin[v]+frame.along[v]*s+frame.across[v]*t]);
    }
    const h=fov/2, points=[];
    for (const edge of [-h,h]) {
      if (Math.abs(b)>1e-8 && Math.abs((c-a*edge)/b)<=h+1e-7) points.push([edge,(c-a*edge)/b]);
      if (Math.abs(a)>1e-8 && Math.abs((c-b*edge)/a)<=h+1e-7) points.push([(c-b*edge)/a,edge]);
    }
    return points.map(([s,t])=>[origin[u]+frame.along[u]*s+frame.across[u]*t,origin[v]+frame.along[v]*s+frame.across[v]*t])
      .filter((p,i,all)=>all.findIndex(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-6)===i);
  }
  globalThis.PlannerGeometry = {views,stack,intersection,dot};
})();
