import '../../../study-store.js';
import {blank,lookup} from './model.js';

const mergeById = (local,incoming,choose) => {
  const rows=new Map(local.map(row=>[row.id,row]));
  for (const value of incoming) {
    const old=rows.get(value.id);
    rows.set(value.id,old?choose(old,value):value);
  }
  return [...rows.values()];
};
const compareAttempt=(a,b)=>{
  const fields=['question','version','at','topic','subject','session','mode','correct','hint','ms'];
  return fields.every(field=>a[field]===b[field]) && JSON.stringify(a.response)===JSON.stringify(b.response);
};
const date = value=>Number.isFinite(value) && value>=0;
function validCard(card) {
  return card && typeof card.id==='string' && lookup.get(card.question)?.prompt &&
    date(card.at) && typeof card.knew==='boolean';
}
export function mergeBackup(local,value) {
  if (!value || typeof value!=='object' || !value.continuousStudy) throw Error('Choose an MRI Study Lab backup with continuous study data.');
  const study=globalThis.StudyStore.validate(value.continuousStudy);
  const other=value.goStudy;
  if (other && (other.version!==1 || !Array.isArray(other.cards) || !other.cards.every(validCard))) {
    throw Error('Unsupported Go flashcard history.');
  }
  const resets=study.records.filter(row=>row.id==='reset').map(row=>row.value.at);
  let conflicts=0;
  const attempts=mergeById(local.attempts,study.attempts,(a,b)=>{
    if (!compareAttempt(a,b)) conflicts++;
    return a;
  });
  const cards=mergeById(local.cards,other?.cards??[],(a,b)=>{
    if (a.at!==b.at||a.question!==b.question||a.knew!==b.knew) conflicts++;
    return a;
  });
  const bookmarked=study.records.filter(row=>row.id.startsWith('bookmark:'));
  const bookmarks=mergeById(local.bookmarks,bookmarked,(a,b)=>a.at>=b.at?a:b);
  return {record:{...local,attempts,cards,bookmarks,reset:Math.max(local.reset,...resets)},conflicts,
    added:attempts.length-local.attempts.length};
}
export function exportBackup(record,now=Date.now()) {
  return {
    app:'MRI Study Lab',version:3,exported:new Date(now).toISOString(),notes:[],
    continuousStudy:{version:1,attempts:record.attempts,records:[...record.bookmarks,
      ...(record.reset?[{id:'reset',at:record.reset,value:{at:record.reset}}]:[])]},
    goStudy:{version:1,cards:record.cards}
  };
}
export async function openStore() {
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('mri-study-lab-go',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('study');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(Error('Close other MRI Study Lab Go windows and reopen this one.'));
  });
  db.onversionchange=()=>db.close();
  const read=()=>new Promise((resolve,reject)=>{
    const tx=db.transaction('study');
    const req=tx.objectStore('study').get('progress');
    tx.oncomplete=()=>resolve(req.result??blank());
    tx.onabort=()=>reject(tx.error);
  });
  const update=apply=>new Promise((resolve,reject)=>{
    const tx=db.transaction('study','readwrite');
    const store=tx.objectStore('study');
    const req=store.get('progress');
    let result,error;
    req.onsuccess=()=>{
      try {
        const stored=req.result??blank();
        if (stored.version!==1) throw Error('This progress needs a newer Go build.');
        result=apply(stored);
        store.put(result,'progress');
      } catch (e) {error=e;tx.abort();}
    };
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(error??tx.error);
  });
  return {read,update};
}
