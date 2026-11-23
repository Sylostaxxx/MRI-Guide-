import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvenHubPageContainer} from '@evenrealities/even_hub_sdk';
import {layout} from '../src/display.js';
import {blank,questions,lookup,newSession,transition,view,pages,mastery} from '../src/model.js';
import {exportBackup,mergeBackup} from '../src/store.js';

const settings={now:100,id:'session-01',random:()=>0};
const start=mode=>({...blank(),session:newSession(mode,blank(),settings)});
function submit(record,correct,hint=false) {
  const q=lookup.get(record.session.question);
  const index=record.session.order.findIndex(i=>correct?q.key.includes(i):!q.key.includes(i));
  const open={...record,session:{...record.session,phase:'choices',choice:index,hint}};
  const armed=transition(open,'tap',{now:120});
  assert.equal(armed.attempt,undefined);
  assert.equal(armed.session.phase,'confirm');
  assert.equal(transition({...open,session:armed.session},'back').session.phase,'choices');
  return transition({...open,session:armed.session},'tap',{now:500});
}
test('bundled text-only questions preserve shared IDs, keys and content bounds',()=>{
  assert.equal(questions.length,226);
  assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
  for(const q of questions) {
    assert.equal(q.type,'single');
    assert.ok(q.version&&q.topic&&q.lesson&&q.key.length===1&&q.options[q.key[0]]?.[1]);
    assert.ok(q.options.length>=2&&q.options.length<=4);
    assert.ok(q.options.every(([text])=>pages(text,47,5).length===1));
    assert.ok(pages(q.stem).every(body=>body.split('\n').length<=5));
  }
  assert.equal(pages('one two three four five',6,1).length,5);
  assert.deepEqual([...new Set(questions.map(q=>q.subject))].sort(),
    ['Anatomy','Artifacts','Image Production','Patient Care','Physics','Procedures','Safety']);
});
test('SDK accepts study layouts with exactly one capture target and capped image size',()=>{
  const record=start('Quick Study');
  for(const frame of [view(record,{home:true,cursor:0}),view(record),{heading:'T1 recovery',diagram:'t1',footer:'Tap to return'}]) {
    const spec=layout(frame);
    assert.equal(spec.textObject.filter(row=>row.isEventCapture).length,1);
    assert.ok(spec.textObject.every(row=>row.xPosition+row.width<=576&&row.yPosition+row.height<=288));
    assert.equal(validateEvenHubPageContainer(spec).valid,true);
  }
});
test('answers require a confirmation, keep independent and assisted responses distinct, and continue',()=>{
  const record=start('Quick Study');
  assert.equal(transition(record,'tap').session.phase,'choices');
  const wrong=submit(record,false);
  assert.equal(wrong.attempt.correct,false);
  assert.equal(wrong.attempt.ms,400);
  const feedback={...record,session:wrong.session,attempts:[wrong.attempt]};
  let result=feedback;
  for(let i=0;i<8&&result.session.phase==='feedback';i++) result={...result,...transition(result,'tap')};
  assert.equal(result.session.number,2);
  assert.notEqual(result.session.question,record.session.question);
  const right=submit(record,true,true);
  assert.equal(right.attempt.correct,true);
  assert.equal(right.attempt.hint,true);
  assert.equal(mastery({...record,attempts:[right.attempt]},1000).mastered,0);
});
test('flashcard reveals first, then logs self-rating separately',()=>{
  const record=start('Flashcards');
  const opened=transition(record,'tap');
  assert.equal(opened.session.phase,'card-answer');
  const logged=transition({...record,session:opened.session},'tap',{now:300});
  assert.equal(logged.attempt,undefined);
  assert.equal(logged.card.knew,true);
  assert.equal(logged.session.number,2);
});
test('backup merge is idempotent and retains local content on same-ID conflict',()=>{
  const record=start('Quick Study');
  const {attempt}=submit(record,false);
  const original={...record,attempts:[attempt]};
  const payload=exportBackup(original);
  assert.equal(globalThis.StudyStore.validate(payload.continuousStudy),payload.continuousStudy);
  const first=mergeBackup(blank(),payload);
  assert.equal(first.added,1);
  assert.equal(mergeBackup(first.record,payload).added,0);
  payload.continuousStudy.attempts=[{...attempt,correct:true}];
  const conflict=mergeBackup(original,payload);
  assert.equal(conflict.conflicts,1);
  assert.equal(conflict.record.attempts[0].correct,false);
  assert.throws(()=>mergeBackup(original,{continuousStudy:{version:9}}),/backup/);
});

test('official touch sources and omitted zero events share the same controls',async()=>{
  const {studyInput}=await import('../src/input.js');
  assert.equal(studyInput({textEvent:{}}),'tap');
  for (const eventSource of [1,2,3]) assert.equal(studyInput({sysEvent:{eventSource}}),'tap');
  assert.equal(studyInput({sysEvent:{eventType:2,eventSource:1}}),'down');
  assert.equal(studyInput({textEvent:{eventType:3}}),'back');
  assert.equal(studyInput({sysEvent:{eventType:4}}),null);
  assert.equal(studyInput({sysEvent:{eventType:9}}),null);
  assert.equal(studyInput({sysEvent:{}}),null);
});
