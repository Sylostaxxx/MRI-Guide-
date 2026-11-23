import {waitForEvenAppBridge,OsEventTypeList as Event} from '@evenrealities/even_hub_sdk';
import {questions,modes,lookup,newSession,transition,view,mastery} from './model.js';
import {openStore,exportBackup,mergeBackup} from './store.js';
import {makeDisplay} from './display.js';
import {studyInput} from './input.js';

const get=id=>document.getElementById(id);
const status=text=>{get('status').textContent=text;};
const transfer=text=>{get('transfer').textContent=text;};
const prefix='https://sylostaxxx.github.io/MRI-Guide-/';
const diagnostics=new URLSearchParams(location.search).has('sim');
let store,progress,bridge,draw,layoutReady=false,paused=false,connected=true,glassesId;
let home=true,cursor=0,notice='',lastArm=0;
let work=Promise.resolve();
function queue(task) {
  work=work.then(task).catch(error=>status(error?.message??'Study operation failed.'));
}
function updatePhone() {
  const counts=mastery(progress,Date.now());
  get('counts').textContent=questions.length+' text questions · '+progress.attempts.length+
    ' shared attempts · '+progress.cards.length+' flashcard reviews · '+counts.mastered+' mastered';
}
async function render(refresh=false) {
  updatePhone();
  const frame=view(progress,{home,cursor,notice});
  const screen=home?'home':progress.session.phase;
  get('screen').textContent=frame.heading;
  if (draw && connected && !paused) {
    await draw(frame,{refresh});
    layoutReady=true;
    if(diagnostics)console.info('[go] phase='+screen+(home?' menu='+modes[cursor]:progress.session.question.startsWith('go-card-')?' card='+progress.session.question:''));
  }
}
function showLesson(path) {
  if(typeof path!=='string' || !path.startsWith('./'))return;
  const link=get('lesson');
  const url=new URL(path,prefix);
  if(!url.href.startsWith(prefix))return;
  link.href=url.href;
  link.hidden=false;
  notice='Lesson link ready on your phone';
}
async function input(action) {
  if (paused || !connected) return;
  notice='';
  if(home) {
    if(action==='back') {
      await bridge.shutDownPageContainer(1);
      if(diagnostics)console.info('[go] requested system exit mode=1');
      return;
    }
    if(action!=='tap')cursor=(cursor+modes.length+(action==='down'?1:-1))%modes.length;
    else {
      progress=await store.update(saved=>{
        const session=saved.session?.mode===modes[cursor] && lookup.has(saved.session.question)
          ? saved.session:newSession(modes[cursor],saved);
        return {...saved,session};
      });
      home=false;
    }
    await render();
    return;
  }
  const s=progress.session;
  if(action==='tap'&&s.phase==='confirm'&&Date.now()-lastArm<320)return;
  const outcome=transition(progress,action);
  if(outcome.home) {
    home=true;
  } else if(outcome.lesson) {
    showLesson(outcome.lesson);
  } else if(outcome.bookmark) {
    progress=await store.update(saved=>{
      const id='bookmark:'+outcome.bookmark;
      const entry={id,at:Date.now(),value:{bookmarked:true}};
      return {...saved,bookmarks:[...saved.bookmarks.filter(row=>row.id!==id),entry]};
    });
    notice='Bookmarked in study progress';
  } else if(outcome.session) {
    progress=await store.update(saved=>{
      if(saved.session?.id!==s.id || saved.session.number!==s.number || saved.session.phase!==s.phase) {
        throw Error('A second Go window changed this session. Reopen Go to continue.');
      }
      return {...saved,session:outcome.session,
        attempts:outcome.attempt&&!saved.attempts.some(a=>a.id===outcome.attempt.id)
          ? [...saved.attempts,outcome.attempt]:saved.attempts,
        cards:outcome.card&&!saved.cards.some(a=>a.id===outcome.card.id)
          ? [...saved.cards,outcome.card]:saved.cards};
    });
    if(outcome.session.phase==='confirm')lastArm=Date.now();
  }
  await render();
}
function sdkEvent(event) {
  const lifecycle=event.sysEvent?.eventType;
  if(lifecycle===Event.FOREGROUND_EXIT_EVENT||lifecycle===Event.SYSTEM_EXIT_EVENT||lifecycle===Event.ABNORMAL_EXIT_EVENT) {
    paused=true;
    return;
  }
  if(lifecycle===Event.FOREGROUND_ENTER_EVENT) {
    paused=false;
    if(layoutReady)queue(()=>render(true));
    return;
  }
  const action=studyInput(event);
  if(action)queue(()=>input(action));
}
function startTransfer() {
  async function importText(text) {
    let result;
    progress=await store.update(saved=>{
      result=mergeBackup(saved,JSON.parse(text));
      return result.record;
    });
    transfer('Imported '+result.added+' new attempts.'+
      (result.conflicts?' Kept '+result.conflicts+' existing records with conflicting IDs.':''));
    await render();
  }
  get('import').onchange=()=>{
    const file=get('import').files[0];
    get('import').value='';
    if(file)queue(async()=>{
      if(file.size>25_000_000)throw Error('This backup exceeds the 25 MB transfer limit.');
      try {await importText(await file.text());} catch(error){transfer(error.message);}
    });
  };
  get('make-text').onclick=()=>{
    get('backup-text').value=JSON.stringify(exportBackup(progress));
    get('backup-text').focus();
    get('backup-text').select();
  };
  get('load-text').onclick=()=>queue(async()=>{
    try {await importText(get('backup-text').value);}
    catch(error){transfer(error.message);}
  });
  get('export').onclick=async()=>{
    const file=new File([JSON.stringify(exportBackup(progress),null,2)],'mri-study-lab-go-backup.json',{type:'application/json'});
    if(navigator.canShare?.({files:[file]})) {
      try {await navigator.share({files:[file]});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    const url=URL.createObjectURL(file);
    const anchor=document.createElement('a');anchor.href=url;anchor.download=file.name;
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    transfer('Export requested. If your Even app cannot save files, use Transfer as text.');
  };
}
async function main() {
  store=await openStore();
  progress=await store.read();
  if(progress.version!==1)throw Error('Install a newer Go build to open this study data.');
  if(progress.session){
    const initial=modes.indexOf(progress.session.mode);
    if(initial!==-1)cursor=initial;
  }
  updatePhone();
  startTransfer();
  const assistance=setTimeout(()=>status('Open this plugin in Even Hub or the official simulator to use glasses controls.'),3500);
  bridge=await waitForEvenAppBridge();
  clearTimeout(assistance);
  draw=makeDisplay(bridge);
  bridge.onEvenHubEvent(sdkEvent);
  bridge.getDeviceInfo().then(info=>{
    if(info?.isGlasses())glassesId=info.sn;
  }).catch(()=>{});
  bridge.onDeviceStatusChanged(device=>{
    if(glassesId && device.sn!==glassesId)return;
    if(!glassesId)return;
    if(device.isDisconnected()||device.isConnectionFailed()) {
      connected=false;
      status('Glasses disconnected. Your progress is saved on this phone.');
    } else if(device.isConnected()) {
      const wasDisconnected=!connected;
      connected=true;
      if(wasDisconnected||!layoutReady)queue(async()=>{
        status('Glasses connected again.');
        await render(true);
      });
    }
  });
  queue(async()=>{
    await render();
    status('Connected to Even Hub. Study on your G2.');
  });
}
main().catch(error=>status(error?.message??'Could not start MRI Study Lab Go.'));
