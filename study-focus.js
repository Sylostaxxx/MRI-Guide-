(() => {
  const sequenceIds=new Set([
    ...Array.from({length:16},(_,i)=>'a'+String(i+1).padStart(2,'0')),
    's01','s02','s03','s04','s06','s10','s11','s13','s16','s17','s18','s24','s25',
    'n15','n16','n20','n25','le-knee-13','le-knee-14'
  ]);
  const matches=(q,focus)=>focus==='artifact'?q.id.startsWith('art-'):
    focus==='sequence'?sequenceIds.has(q.id)||q.id.startsWith('seq-'):
    focus==='hand'?q.id.startsWith('hand-')||['m08','m09'].includes(q.id):
    focus==='bone'?q.id.startsWith('bone-')||['m01','le-thigh-07','le-leg-05'].includes(q.id):true;
  const titles={artifact:'Artifact Practice',sequence:'Sequence Recognition',hand:'Hand and Wrist Practice',bone:'Long Bone Practice'};
  function unvisited(pool,seen,current) {
    const used=new Set(seen);
    const fresh=pool.filter(q=>!used.has(q.id));
    return fresh.length?fresh:pool.filter(q=>q.id!==current||pool.length===1);
  }
  globalThis.StudyFocus={titles,matches,unvisited};
})();
