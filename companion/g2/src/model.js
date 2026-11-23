import '../../../registry-core.js';
import '../../../study-review.js';
import {cards} from './cards.js';
import bank from './bank.json' with {type:'json'};

const {isCorrect,shuffle} = globalThis.RegistryCore;
const {day,summarize,severeThreshold} = globalThis.StudyReview;
export const questions = bank;
export const modes = ['Quick Study','Flashcards','Weak Areas','Physics Recall'];
export const lookup = new Map([...questions,...cards].map(item=>[item.id,item]));
export const blank = () => ({version:1,attempts:[],cards:[],bookmarks:[],reset:0,session:null});
const recentLimit = 18;
const topicKey = value => value.toLowerCase().replace(/[^a-z0-9]/g,'');
const subtitle = question => question.topic ?? (question.physics?'Physics Recall':'Flashcards');
const pool = mode => mode === 'Flashcards' ? cards : mode === 'Physics Recall' ? cards.filter(card=>card.physics) : questions;
export const mastery = (record,now) => {
  const rows = summarize(record.attempts,record.reset);
  const eligible = questions.filter(q=>rows.has(q.id));
  return {due:eligible.filter(q=>rows.get(q.id).due>0 && rows.get(q.id).due<=now).length,
    severe:eligible.filter(q=>rows.get(q.id).misses>=severeThreshold && !rows.get(q.id).mastered).length,
    mastered:eligible.filter(q=>rows.get(q.id).mastered).length};
};
function matchConcept(current,other) {
  return current.id!==other.id && (topicKey(current.topic)===topicKey(other.topic) ||
    (current.lesson?.includes('academy.html?lesson=') && current.lesson===other.lesson));
}
export function selectQuestion(mode,record,recent,random= Math.random,now=Date.now()) {
  const source = pool(mode);
  const available = source.filter(item=>!recent.includes(item.id));
  const items = available.length?available:source.filter(item=>item.id!==recent.at(-1));
  if (mode!=='Weak Areas') return shuffle(items,random)[0]??source[0];
  const stats = summarize(record.attempts,record.reset);
  const priority = q => {
    const row = stats.get(q.id);
    if (!row) return 0;
    const due = row.due>0 && row.due<=now;
    return (row.mastered? -15:1) + (row.misses>=severeThreshold && !row.mastered?14:0)
      + Math.min(12,row.misses*3) + (due?8:0) + (row.lastMiss && now-row.lastMiss<7*day?4:0)
      + (now-row.last<2*day?2:0);
  };
  return shuffle(items,random).sort((a,b)=>priority(b)-priority(a))[0]??source[0];
}
export function ascii(value) {
  return value.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—−]/g,'-').replace(/×/g,'x').replace(/°/g,' deg')
    .replace(/→/g,'->').replace(/µ/g,'u').replace(/π/g,'pi').replace(/γ/g,'gamma')
    .replace(/α/g,'alpha').replace(/Δ/g,'delta ').replace(/ρ/g,'rho').replace(/√/g,'sqrt')
    .replace(/²/g,'^2').replace(/³/g,'^3').replace(/⁻¹/g,'^-1').replace(/½/g,'1/2')
    .replace(/ /g,' ').replace(/[₀₁₂]/g,c=>String('₀₁₂'.indexOf(c)));
}
export function pages(value, width=47, lines=5) {
  const words=ascii(value).trim().split(/\s+/).flatMap(word=>
    word.length>width?Array.from({length:Math.ceil(word.length/width)},(_,i)=>word.slice(i*width,(i+1)*width)):[word]);
  const wrapped=[];
  let line='';
  for (const word of words) {
    if (line && line.length+1+word.length>width) {wrapped.push(line);line='';}
    line+=(line?' ':'')+word;
  }
  if (line) wrapped.push(line);
  return Array.from({length:Math.max(1,Math.ceil(wrapped.length/lines))},(_,i)=>wrapped.slice(i*lines,(i+1)*lines).join('\n'));
}
function move(index,by,count) {return (index+by+count)%count;}
function sessionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // The development QR uses a LAN HTTP URL where randomUUID may be unavailable.
  const random=crypto.getRandomValues(new Uint8Array(16));
  return Array.from(random,value=>value.toString(16).padStart(2,'0')).join('');
}
export function newSession(mode,record,{random=Math.random,now=Date.now(),id=sessionId()}={}) {
  return nextQuestion({id,mode,recent:[],number:0},record,random,now);
}
function nextQuestion(session,record,random,now,forced) {
  const question = forced??selectQuestion(session.mode,record,session.recent,random,now);
  return {...session,question:question.id,started:now,number:session.number+1,phase:'prompt',
    choice:0,page:0,action:0,hint:false,result:null,
    recent:[...session.recent,question.id].slice(-recentLimit),
    order:question.options?shuffle(question.options.map((_,i)=>i),random):[]};
}
export function actions(session) {
  const q=lookup.get(session.question);
  if (session.phase==='card-answer') return ['Knew it','Missed it',...(q.id==='go-card-t1'||q.id==='go-card-t2'?['See curve']:[])];
  if (session.phase==='feedback') return ['Next question',...(!session.result.correct?[questions.some(other=>matchConcept(q,other))?'Try same concept':'Practice this subject']:[]),
    'Review on phone', 'Bookmark question'];
  return [];
}
function reading(session) {
  const q=lookup.get(session.question);
  if (session.phase==='prompt') return pages(q.stem??q.prompt);
  if (session.phase==='card-answer') return pages(q.answer,47,4);
  if (session.phase==='feedback') {
    const correct=q.options[q.key[0]];
    const picked=q.options[session.result.response[0]];
    return [ ...pages('Answer: '+correct[0]+'. '+correct[1],47,4),
      ...(!session.result.correct?pages('Your choice: '+picked[0]+'. '+picked[1],47,4):[]) ];
  }
  return [''];
}
export function transition(record, input, {random=Math.random, now=Date.now()} = {}) {
  const s=record.session;
  if (!s) return {};
  const q=lookup.get(s.question);
  const readingPages=reading(s);
  const list=actions(s);
  const advance=(phase,extra={})=>({session:{...s,phase,page:0,action:0,...extra}});
  const handleAnswer=()=>{
    const response=[s.order[s.choice]];
    const attempt={id:'g2:'+s.id+':'+s.number,question:q.id,version:q.version,at:now,topic:q.topic,subject:q.subject,
      session:s.id,mode:'continuous',source:'g2',response,correct:isCorrect(q,response),hint:s.hint,ms:Math.max(0,now-s.started)};
    return {...advance('feedback',{result:attempt}),attempt};
  };
  if (input==='back') {
    if (s.phase==='prompt') return {home:true};
    if (s.phase==='choices') return advance('prompt');
    if (s.phase==='confirm') return advance('choices');
    if (s.phase==='diagram') return advance('card-answer');
    return {home:true};
  }
  if (s.phase==='prompt') {
    if (input!=='tap') return {session:{...s,page:move(s.page,input==='up'?-1:1,readingPages.length)}};
    if (s.page+1<readingPages.length) return {session:{...s,page:s.page+1}};
    return advance(q.options?'choices':'card-answer');
  }
  if (s.phase==='choices') {
    if (input!=='tap') return {session:{...s,choice:move(s.choice,input==='up'?-1:1,s.order.length+1),page:0}};
    return s.choice===s.order.length ? advance('prompt',{hint:true,choice:0}) : advance('confirm');
  }
  if (s.phase==='confirm') return input==='tap'?handleAnswer():advance('choices');
  if (s.phase==='diagram') return advance('card-answer');
  if (input==='up') return {session:{...s,action:move(s.action,-1,list.length)}};
  if (input==='down') return {session:{...s,action:move(s.action,1,list.length)}};
  if (s.page+1<readingPages.length) return {session:{...s,page:s.page+1}};
  const action=list[s.action];
  if (action==='Review on phone') return {lesson:q.lesson};
  if (action==='Bookmark question') return {bookmark:q.id};
  if (action==='See curve') return advance('diagram');
  if (s.phase==='card-answer') return {
    session:nextQuestion(s,record,random,now),
    card:{id:'g2:'+s.id+':'+s.number,question:q.id,at:now,knew:action==='Knew it'}
  };
  if (action==='Try same concept'||action==='Practice this subject') {
    const related=questions.filter(other=>action==='Try same concept'?matchConcept(q,other):other.id!==q.id&&other.subject===q.subject);
    const unseen=related.filter(other=>!s.recent.includes(other.id));
    return {session:nextQuestion(s,record,random,now,shuffle(unseen.length?unseen:related,random)[0])};
  }
  return {session:nextQuestion(s,record,random,now)};
}
export function view(record,{cursor,home,notice='',now=Date.now()}={}) {
  const s=record.session;
  if (home || !s) {
    const summary=mastery(record,now);
    return {heading:'MRI Study Lab Go',body:modes.map((m,i)=>(i===cursor?'> ':'  ')+m+
      (m==='Weak Areas'&&summary.due?' ('+summary.due+' due)':'')).join('\n'),
      footer:notice||'Swipe to select  |  Tap to open\nDouble tap to exit'};
  }
  const q=lookup.get(s.question);
  const heading=s.mode+'  /  '+s.number;
  const text=reading(s);
  const pageLabel=text.length>1?'  '+(s.page+1)+'/'+text.length:'';
  if (s.phase==='prompt') return {heading:heading+pageLabel,body:text[s.page],
    footer:(s.hint?'Assisted cue: '+pages(subtitle(q),46,1)[0]+'\n':'')+'Tap: '+(s.page+1<text.length?'read more':q.options?'choices':'reveal')+'  |  Double: menu'};
  if (s.phase==='choices'||s.phase==='confirm') {
    const hint=s.choice===s.order.length;
    const option=hint?'Show a topic hint':q.options[s.order[s.choice]][0];
    return {heading:(s.phase==='confirm'?'Submit this answer?':heading),
      body:(hint?'Optional hint':'Choice '+(s.choice+1)+' of '+s.order.length)+'\n\n'+pages(option,47,5).join('\n'),
      footer:s.phase==='confirm'?'Tap to submit  |  Double: cancel':'Swipe: choices  |  Tap: select\nDouble: prompt'};
  }
  if (s.phase==='diagram') return {heading:q.id.endsWith('t1')?'T1 recovery':'T2 decay',body:'',diagram:q.id.endsWith('t1')?'t1':'t2',
    footer:'Time / T (x)  |  Relative M (y)\nTap: back to card'};
  const label=s.phase==='feedback'?(s.result.correct?'CORRECT':'INCORRECT')+(s.result.hint?'  /  assisted':''):'Answer';
  const list=actions(s);
  return {heading:label+pageLabel,body:text[s.page],
    footer:notice || (s.page+1<text.length?'Tap: read more  |  Double: menu':
      '> '+list[s.action]+'  ('+(s.action+1)+'/'+list.length+')\nSwipe: action  |  Tap: select')};
}
