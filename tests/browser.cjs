const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');
const playwright = require('playwright');

async function run() {
  // Mirror the GitHub Pages subdirectory and use a trustworthy localhost origin.
  const origin = 'http://127.0.0.1:4173';
  const home = origin + '/MRI-Guide-/';
  const path = require('node:path');
  const fs = require('node:fs');
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'mri-study-tests-'));
  fs.symlinkSync(process.cwd(), path.join(root, 'MRI-Guide-'), 'dir');
  const server = spawn('python3', ['-m','http.server','4173','--bind','127.0.0.1','--directory',root],
    { stdio:'ignore' });
  let browser;
  try {
    for (let retry=0; ; retry++) {
      try {
        const available = await new Promise((resolve,reject) => {
          http.get(home,response => {
            response.resume();
            response.on('end',() => resolve(response.statusCode === 200));
          }).on('error',reject);
        });
        if (available) break;
      } catch {}
      if (retry === 49) throw Error('Static server did not start.');
      await delay(100);
    }
    const engine = process.argv[2] ?? 'chromium';
    browser = await playwright[engine].launch();
    const context = await browser.newContext({ viewport:{width:820,height:1180}, hasTouch:true,
      acceptDownloads:true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error => errors.push(error.stack || error.message));
    async function sampleMRIQuestion(manifestPath,independent=false) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath));
      await page.locator('#practice').click();
      const prompt = await page.locator('#quizTarget').textContent();
      const id = Object.keys(manifest.labels).find(id => prompt === manifest.labels[id].name);
      assert.ok(id, prompt);
      const [x,y,z] = manifest.anchors[id];
      assert.equal(await page.locator('#explorePanel').isVisible(),false);
      await page.locator('#zoom').fill('1.25');
      await page.locator('#views canvas').first().scrollIntoViewIfNeeded();
      const questionBounds=await page.locator('#quizPanel').boundingBox();
      assert.ok(questionBounds.y>=-1&&questionBounds.y<300);
      const gray=await page.locator('#views canvas').first().evaluate(canvas=>{
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        for(let i=0;i<data.length;i+=4)if(data[i]!==data[i+1]||data[i+1]!==data[i+2])return false;
        return true;
      });
      assert.equal(gray,true);
      if(!independent){
        for(let level=1;level<=3;level++){
          await page.locator('#quizHint').click();
          assert.match(await page.locator('#quizFeedback').textContent(),new RegExp('Hint '+level+' shown'));
        }
      }else await page.locator('#zoom').fill('1');
      const view = page.getByRole('img',{name:'Axial MRI slice'});
      const rendered = await view.evaluate((canvas,{x,y})=>{
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
        const row=canvas.height-1-y;
        let highlight=false;
        for(let py=Math.max(0,row-7);py<=Math.min(canvas.height-1,row+7);py++) {
          for(let px=Math.max(0,x-7);px<=Math.min(canvas.width-1,x+7);px++) {
            const i=(py*canvas.width+px)*4;
            if(pixels.data[i]>pixels.data[i+1]+18 && pixels.data[i+1]>pixels.data[i+2]+45) highlight=true;
          }
        }
        return {highlight, x:(x+.5)/canvas.width,y:(row+.5)/canvas.height};
      },{x,y});
      assert.equal(rendered.highlight,!independent);
      assert.match(await page.locator('#views h2').first().textContent(),new RegExp(' '+(z+1)+' /'));
      // WebKit's mouse automation can round a CSS position across a cartilage
      // voxel boundary. Feed the exact subpixel intersection into picking.
      await view.scrollIntoViewIfNeeded();
      await view.evaluate((canvas,point)=>{
        const box=canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointerdown',{
          isPrimary:true,pointerType:'mouse',
          clientX:box.left+box.width*point.x,clientY:box.top+box.height*point.y
        }));
      },rendered);
      assert.match(await page.locator('#quizFeedback').textContent(),independent?/Independent recall/:/with a hint/);
      const attempt=await page.evaluate(()=>JSON.parse(localStorage.getItem('mri-study-lab-review-v1'))[0]);
      assert.equal(attempt.ok,independent);
      assert.equal(attempt.correct,true);
      assert.equal(attempt.assisted,!independent);
      assert.equal(attempt.hintLevel,independent?0:3);
      await page.locator('#quizExit').click();
    }
    const ready=()=>page.waitForFunction(()=>document.querySelector('#status').textContent.includes('MRI and labels saved for offline use.'),{},{timeout:60000});
    await page.goto(home);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.deepEqual(errors,[]);
    const primary=()=>page.getByRole('navigation',{name:'Primary navigation'});
    assert.deepEqual(await page.locator('.primary-links a').allTextContents(),['Anatomy','Clinical','Physics','Study Center']);
    await primary().getByRole('link',{name:'Physics',exact:true}).click();
    await page.getByRole('heading',{name:'Physics Academy',exact:true}).waitFor();
    await page.getByRole('link',{name:/^Physics Sandbox/}).click();
    await page.locator('#sField').selectOption('3');
    assert.match(await page.locator('#larmor').textContent(), /127.73 MHz/);
    await page.locator('#sTR').fill('3000');
    assert.match(await page.locator('#relaxationSummary').textContent(), /TR 3000 ms/);
    await page.getByRole('link',{name:'Clinical',exact:true}).click();
    await page.getByRole('heading',{name:'Clinical Dashboard',exact:true}).waitFor();
    await page.getByRole('link',{name:/^Scanner Simulator/}).click();
    await page.getByRole('heading',{name:'Scanner Simulator',exact:true}).waitFor();
    await page.getByRole('link',{name:'Open clinical challenge',exact:true}).click();
    await page.getByRole('heading',{name:'Virtual Clinical Rotation',exact:true}).first().waitFor();
    await page.getByRole('group',{name:'Page history'}).getByRole('button',{name:'Back',exact:true}).click();
    await page.getByRole('heading',{name:'Scanner Simulator',exact:true}).waitFor();
    assert.match(await page.locator('#protoCoverage').textContent(), /60.0 mm/);
    await page.locator('#protoNew').click();
    assert.match(await page.locator('#protoInstruction').textContent(),/axial brain stack/);
    await page.getByRole('link',{name:'Clinical home',exact:true}).click();
    await page.getByRole('link',{name:/^Slice Planner/}).click();
    await page.getByText('Available offline',{exact:false}).waitFor({timeout:60000});
    assert.equal(await page.locator('#planViews canvas:visible').count(),3);
    await page.locator('#planCount').fill('7');
    await page.locator('#planThickness').selectOption('3');
    await page.locator('#planGap').selectOption('2');
    assert.match(await page.locator('#planCoverage').textContent(),/33.0 mm/);
    await page.locator('#angle').fill('25');
    await page.locator('#planPhase').selectOption('across');
    await page.locator('#planSat').selectOption('20');
    await page.locator('#planSlice').fill('3');
    const planCanvas=page.getByRole('img',{name:'Sagittal MRI planning localizer'});
    await planCanvas.scrollIntoViewIfNeeded();
    const rect=await planCanvas.boundingBox();
    const center=await page.locator('#planCenter').textContent();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
    await page.mouse.down();
    await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.55,{steps:3});
    await page.mouse.up();
    assert.notEqual(await page.locator('#planCenter').textContent(),center);
    await page.locator('#region').selectOption('shoulder');
    assert.match(await page.locator('#plannerSource').textContent(),/Schematic fallback/);
    await page.locator('#region').selectOption('brain');
    await page.locator('#quicknote').fill('Existing notebook entry');
    await page.locator('#quickSave').click();
    await page.getByRole('link',{name:'Anatomy',exact:true}).click();
    await page.locator('summary').filter({hasText:'Brain & Head'}).click();
    await page.getByRole('link',{name:'Brain and cranial nerves',exact:true}).click();
    await page.locator('#load').click();
    await ready();
    assert.equal(await page.locator('canvas').count(),3);
    await page.getByRole('button',{name:'Cross-Sectional Anatomy'}).click();
    await page.waitForFunction(()=>document.querySelector('#plateImage').naturalWidth>0);
    assert.equal(await page.locator('#platePractice').isVisible(),true);
    const studyPlate=await page.locator('#plateImage').getAttribute('src');
    await page.setViewportSize({width:1180,height:820});
    await page.locator('#platePractice').click();
    assert.equal(await page.locator('#plateImage').getAttribute('src'),'./atlas/quiz/brain.webp');
    await page.locator('#quizExit').click();
    assert.equal(await page.locator('#plateImage').getAttribute('src'),studyPlate);
    await page.locator('#plateMixed').click();
    for(let question=0;question<6;question++){
      assert.equal(await page.locator('#quizCount').textContent(),'Question '+(question+1)+' of 6');
      assert.match(await page.locator('#plateImage').getAttribute('src'),/^\.\/atlas\/quiz\/(heart|knee|brain)\.webp$/);
      assert.equal(await page.locator('#plateImage').getAttribute('alt'),'Unlabeled anatomy illustration');
      assert.equal(await page.locator('#plateCaption').isVisible(),false);
      assert.equal(await page.locator('.plate-point.hinted').count(),0);
      if(question===0){
        const source=await page.locator('#plateImage').getAttribute('src');
        const subjects=source.includes('heart')
          ? ['Left atrium','Right atrium','Left ventricle','Right ventricle']
          : source.includes('knee')?['Femur','Patella','Tibia','Femoral cartilage']
          : ['Cerebellum','Pituitary gland','Thalamus','Spinal cord'];
        const target=await page.locator('#quizTarget').textContent();
        const wrong=(subjects.indexOf(target)+1)%4+1;
        await page.getByRole('button',{name:'Location '+wrong,exact:true}).click();
        assert.equal(await page.locator('#quizFeedback').getAttribute('data-tone'),'incorrect');
        assert.equal(await page.locator('.plate-point.hinted').count(),0);
      }
      for(let level=1;level<=3;level++){
        await page.locator('#quizHint').click();
        assert.equal(await page.locator('.plate-point.hinted').count(),level===3?1:0);
      }
      const hint=page.locator('.plate-point.hinted');
      assert.equal(await hint.count(),1);
      if(question===0){
        const location=await hint.textContent();
        await page.locator('#quizHideHint').click();
        assert.equal(await hint.count(),0);
        await page.getByRole('button',{name:'Location '+location,exact:true}).click();
        assert.match(await page.locator('#quizFeedback').textContent(),/with a hint/);
      }else await hint.click();
      await page.locator('#quizNext').click();
    }
    assert.match(await page.locator('#studyMessage').textContent(),/Quiz complete.*6 assisted/);
    assert.equal(await page.locator('#plateImage').getAttribute('src'),studyPlate);
    await page.setViewportSize({width:820,height:1180});
    await page.getByRole('button',{name:'Side-by-Side Comparison'}).click();
    assert.equal(await page.locator('#views').isVisible(),true);
    assert.equal(await page.locator('#atlasPlate').isVisible(),true);
    await page.getByRole('button',{name:'Real MRI',exact:true}).click();
    await page.locator('#zoom').fill('2');
    assert.match(await page.locator('#views canvas').first().evaluate(c=>c.style.transform),/scale\(2\)/);
    await page.getByRole('button',{name:'Pan images'}).click();
    const panCanvas=page.locator('#views .image').first();
    await panCanvas.scrollIntoViewIfNeeded();
    const panRect=await panCanvas.boundingBox();
    await page.mouse.move(panRect.x+panRect.width/2,panRect.y+panRect.height/2);
    await page.mouse.down();
    await page.mouse.move(panRect.x+panRect.width*.6,panRect.y+panRect.height*.55,{steps:3});
    await page.mouse.up();
    assert.notEqual(await panCanvas.locator('canvas').evaluate(c=>c.style.transform),'translate(0%, 0%) scale(2)');
    await page.getByRole('button',{name:'Reset zoom and pan'}).click();
    await page.locator('#layerDrawer summary').click();
    await page.getByRole('button',{name:'Hide all',exact:true}).click();
    await page.locator('#search').fill('Left Thalamus');
    await page.getByText('No matching structures.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Show all',exact:true}).click();

    await page.locator('#search').fill('Left Thalamus');
    await page.getByRole('button',{name:'Left Thalamus',exact:true}).click();
    await page.getByRole('heading',{name:'Left Thalamus'}).waitFor();
    await page.locator('#notes').fill('Atlas observation');
    await page.locator('#save').click();
    await page.locator('#bookmark').click();
    await page.locator('#ink').click();
    const canvas = page.getByRole('img',{name:'Axial MRI slice'});
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+20,{steps:5});
    await page.mouse.up();
    assert.equal(await page.locator('#undo').isEnabled(),true);
    await page.locator('#atlasRegion').selectOption('spine');
    await page.getByRole('heading',{name:'Cervical Spine Atlas'}).waitFor();
    await page.locator('#load').click();
    await ready();
    await page.getByRole('button',{name:'C2–C3 disc',exact:true}).click();
    await page.getByRole('heading',{name:'C2–C3 disc',exact:true}).waitFor();
    await sampleMRIQuestion('atlas/spine/manifest.json');
    await page.locator('#atlasRegion').selectOption('knee');
    await page.getByRole('heading',{name:'Knee MRI Atlas'}).waitFor();
    await page.locator('#load').click();
    await ready();
    await page.getByRole('button',{name:'Femoral cartilage',exact:true}).click();
    await page.getByRole('heading',{name:'Femoral cartilage',exact:true}).waitFor();
    await page.locator('#layerDrawer summary').click();
    await page.getByRole('button',{name:'Isolate selected structure'}).click();
    assert.match(await page.locator('#layerStatus').textContent(),/Isolated.*Femoral cartilage/);
    await page.getByRole('button',{name:'Reset layers'}).click();

    await page.locator('#windowDrawer summary').click();
    await page.locator('#overlay').uncheck();
    await sampleMRIQuestion('atlas/knee/manifest.json');
    assert.equal(await page.locator('#overlay').isChecked(),false);
    await page.locator('#overlay').check();
    await page.locator('#atlasRegion').selectOption('cardiac');
    await page.getByRole('heading',{name:'Cardiac MRI Atlas'}).waitFor();
    await page.locator('#load').click();
    await ready();
    await page.getByRole('button',{name:'Left atrium',exact:true}).click();
    await page.getByRole('heading',{name:'Left atrium',exact:true}).waitFor();
    await new Promise(resolve => { server.once('exit',resolve);server.kill(); });
    await page.goto(home + 'brain-atlas.html?region=cardiac',{waitUntil:'domcontentloaded'});
    await ready();
    await sampleMRIQuestion('atlas/cardiac/manifest.json',true);
    await sampleMRIQuestion('atlas/cardiac/manifest.json');
    await page.goto(home + 'brain-atlas.html?region=knee',{waitUntil:'domcontentloaded'});
    await ready();
    await page.getByRole('button',{name:'Femur',exact:true}).click();
    await page.getByRole('heading',{name:'Femur',exact:true}).waitFor();
    await page.goto(home + 'brain-atlas.html?region=spine',{waitUntil:'domcontentloaded'});
    await ready();
    await page.getByRole('button',{name:'C7–T1 disc',exact:true}).click();
    await page.getByRole('heading',{name:'C7–T1 disc',exact:true}).waitFor();
    await page.goto(home + 'brain-atlas.html', {waitUntil:'domcontentloaded'});
    await ready();
    await page.locator('#search').fill('Left Thalamus');
    await page.getByRole('button',{name:'Left Thalamus',exact:true}).click();
    assert.equal(await page.locator('#notes').inputValue(),'Atlas observation');
    assert.equal(await page.locator('#undo').isEnabled(),true);
    await page.getByRole('link',{name:'Clinical',exact:true}).click();
    await page.getByRole('link',{name:/^Slice Planner/}).click();
    await page.getByText('Available offline',{exact:false}).waitFor({timeout:60000});
    for (const region of ['cspine','knee','brain']) {
      await page.locator('#region').selectOption(region);
      await page.getByText('Available offline',{exact:false}).waitFor({timeout:60000});
    }
    await page.getByRole('link',{name:'Settings',exact:true}).click();
    await page.getByRole('link',{name:'Notes and bookmarks',exact:true}).click();
    assert.equal(await page.locator('#bookmarkList a').first().textContent(),'Left Thalamus');
    assert.match(await page.locator('#atlasNoteList').textContent(),/Atlas observation/);
    await page.getByRole('link',{name:'Anatomy',exact:true}).click();
    await page.getByLabel('Filter by organ system').selectOption({label:'Urinary'});
    await page.getByRole('link',{name:/^Kidney/}).click();
    assert.equal(await page.locator('#system option').count(),11);
    await page.locator('#bodyRegion').selectOption('Thorax');
    assert.equal(await page.locator('#system option').count(),3);
    await page.locator('#bodyRegion').selectOption('');

    await page.locator('#system').selectOption({label:'Urinary'});
    await page.getByRole('heading',{name:'Kidney',exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('#diagram').naturalWidth>0);
    await page.locator('#organNote').fill('Kidney study note');
    await page.locator('#organSave').click();
    await page.getByRole('link',{name:'Physics',exact:true}).click();
    await page.getByRole('link',{name:/^Artifact Academy/}).click();
    const phantom=page.locator('#phantom');
    const baseline=await phantom.evaluate(canvas=>canvas.toDataURL());
    await page.locator('#severity').fill('90');
    assert.notEqual(await phantom.evaluate(canvas=>canvas.toDataURL()),baseline);
    await page.getByRole('link',{name:'Clinical',exact:true}).click();
    await page.getByRole('link',{name:/^Clinical Challenges/}).click();
    for (const choice of [1,0,2,0,1]) {
      await page.locator('#choices button').nth(choice).click();
      await page.locator('#next').click();
    }
    assert.match(await page.locator('#stem').textContent(),/5 of 5/);
    await page.goto(home+'study-center.html?section=mastery');
    assert.match(await page.locator('#masteryRows').textContent(),/Virtual Clinical Rotation5 \/ 50/);
    await page.getByRole('link',{name:'Settings',exact:true}).click();
    const downloaded = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloaded;
    const backup = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backup.notes[0].body,'Existing notebook entry');
    assert.equal(backup.scanNotes['mri.scan.note.cerebra1.91'],'Atlas observation');
    assert.equal(Object.keys(backup.drawings).length,1);
    assert.equal(backup.scanNotes['mri.scan.note.system.9'],'Kidney study note');
    assert.ok(backup.layers['mri.atlas.layers.knee1'].enabled.includes('cartilage'));
    assert.equal(backup.bookmarks['mri.atlas.bookmark.cerebra1:91'],'Left Thalamus');
    assert.equal(backup.history.filter(attempt=>attempt.topic==='training:rotation').length,5);
    await page.goto(home+'registry.html');
    await page.getByText(/293 original study items/).waitFor();
    await page.locator('#profile').selectOption('armrit');
    await page.locator('#kind').selectOption('calc');
    await page.locator('#startTutor').click();
    await page.locator('#hint').click();
    await page.locator('#choices input').first().click();
    await page.locator('#check').click();
    await page.locator('#explanation').waitFor();
    await page.locator('#review').click();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#submit').click();
    assert.match(await page.locator('#resultScore').textContent(),/1 assisted/);
    await page.locator('#resultHome').click();
    await page.locator('#history button').first().waitFor();
    await page.locator('#startExam').click();
    await page.locator('#flag').click();
    await page.reload();
    assert.equal(await page.locator('#flag').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#questionCount').textContent(),/230/);
    assert.equal(await page.locator('#hint').isVisible(),false);
    assert.equal(await page.locator('#check').isVisible(),false);
    assert.equal(await page.locator('#teachRegistry').isVisible(),false);
    assert.equal(await page.evaluate(()=>{
      const {active}=JSON.parse(localStorage.getItem('mri.registry.v1'));
      return active.deadline-active.started;
    }),230*60000);
    await page.addInitScript(()=>{
      const key='mri.registry.v1';
      const saved=JSON.parse(localStorage.getItem(key)??'null');
      if(saved?.active?.mode==='exam'){
        saved.active.deadline=Date.now()-10;
        localStorage.setItem(key,JSON.stringify(saved));
      }
    });
    await page.reload();
    await page.locator('#resultScore').waitFor();
    assert.match(await page.locator('#resultScore').textContent(),/0 of 200 independently correct/);
    assert.match(await page.locator('#storageMessage').textContent(),/submitted automatically/);
    // The HTTP server is already stopped. Confirm that a cached image-backed
    // question is usable without putting WebKit into its simulated offline mode.
    await page.locator('#resultHome').click();
    await page.locator('#kind').selectOption('image');
    await page.locator('#startTutor').click();
    await page.waitForFunction(()=>document.querySelector('#questionImage').naturalWidth>0);
    const imageWidth=await page.locator('#questionImage').evaluate(img=>img.width);
    await page.locator('#imageZoom').fill('2');
    assert.ok(await page.locator('#questionImage').evaluate(img=>img.width)>imageWidth);
    // Every marked asset uses a real 2D overlay at the registered native resolution.
    const visualAudit=await page.evaluate(async()=>{
      const failures=[];
      for(const q of RegistryContent.bank.filter(q=>q.image)){
        const asset=RegistryImages[q.image];
        if(!await RegistryImageView.ready(q)){failures.push(q.id+' missing');continue;}
        const canvas=document.createElement('canvas');
        RegistryImageView.paint(canvas,asset,false);
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let bright=0,dark=0;
        for(let i=0;i<pixels.length;i+=4){
          if(pixels[i+3]>180&&pixels[i]>230)bright++;
          if(pixels[i+3]>180&&pixels[i]<12)dark++;
        }
        if(asset.marked&&(!bright||!dark)||!asset.marked&&(bright||dark))failures.push(q.id+' contrast');
        if(asset.marker&&asset.marker.type!=='segmentation'){
          const [x,y]=asset.marker.target.map(Math.round);
          const spot=canvas.getContext('2d').getImageData(x-5,y-5,11,11).data;
          if(!spot.some((v,i)=>i%4===3&&v>180))failures.push(q.id+' missing endpoint');
        }
      }
      return failures;
    });
    assert.deepEqual(visualAudit,[]);
    await page.locator('#review').click();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#submit').click();
    await page.locator('#resultScore').waitFor();
    // All new study flows run after the static origin has stopped.
    await page.goto(home+'practice.html');
    await page.getByText(/423 practice questions/).waitFor();
    await page.locator('#subject').selectOption('Physics');
    await page.locator('#difficulty').selectOption('Beginner');
    await page.locator('#start').click();
    await page.getByText('Question 1',{exact:true}).waitFor();
    const currentQuestion=await page.locator('#practiceStem').textContent();
    await page.locator('#pause').click();
    await page.getByRole('button',{name:'Resume',exact:true}).waitFor();
    await page.reload();
    await page.getByRole('button',{name:'Resume',exact:true}).click();
    await page.locator('#practiceStem').waitFor();
    assert.equal(await page.locator('#practiceStem').textContent(),currentQuestion);
    const practiceQuestion=await page.evaluate(()=>RegistryContent.bank.find(q=>q.stem===document.querySelector('#practiceStem').textContent));
    const choose=async(q,index)=>page.locator('#practiceChoices button').getByText(q.options[index][0],{exact:true}).click();
    const wrong=practiceQuestion.type==='order'? [...practiceQuestion.key].reverse():
      [practiceQuestion.options.findIndex((_,index)=>!practiceQuestion.key.includes(index))];
    for(const index of wrong)await choose(practiceQuestion,index);
    await page.locator('#checkPractice').click();
    await page.getByText('✕ INCORRECT',{exact:true}).waitFor();
    assert.ok(await page.locator('.choice-bad').count()>0);
    if(practiceQuestion.type!=='order')assert.equal(await page.locator('.choice-good').count(),practiceQuestion.key.length);
    await page.getByRole('button',{name:'Trouble Questions',exact:true}).click();
    await page.locator('#troubleRows').getByText(currentQuestion,{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Retry Question',exact:true}).count()>=1,true);
    await page.getByRole('button',{name:'Continuous Practice',exact:true}).click();
    await page.locator('#nextPractice').click();
    await page.getByText('Question 2',{exact:true}).waitFor();
    assert.notEqual(await page.locator('#practiceStem').textContent(),currentQuestion);
    const second=await page.evaluate(()=>RegistryContent.bank.find(q=>q.stem===document.querySelector('#practiceStem').textContent));
    for(const index of second.key)await choose(second,index);
    await page.locator('#checkPractice').click();
    await page.getByText('✓ CORRECT!',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Study Dashboard',exact:true}).click();
    assert.match(await page.locator('#dashboardStats').textContent(),/Answered today/);
    await page.goto(home+'academy.html?lesson=t1');
    await page.getByRole('heading',{name:'T1 longitudinal relaxation',exact:true}).waitFor();
    await page.locator('#diagramValue').fill('1200');
    assert.match(await page.locator('#diagramReadout').textContent(),/86.5%/);
    for (const viewport of [{width:820,height:1180},{width:1180,height:820}]) {
      await page.setViewportSize(viewport);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({width:820,height:1180});
    await page.locator('#bookmarkLesson').click();
    await page.getByText('Lesson progress saved.',{exact:true}).waitFor();
    await page.reload();
    await page.getByRole('button',{name:'Bookmarked',exact:true}).waitFor();
    await page.getByRole('link',{name:'Take five-question quiz',exact:true}).click();
    await page.getByRole('button',{name:'Start five-question lesson quiz',exact:true}).click();
    await page.getByText('Question 1 of 5',{exact:true}).waitFor();
    const savedStudy=await page.evaluate(()=>StudyStore.snapshot());
    assert.equal(savedStudy.attempts.filter(a=>a.mode==='continuous').length,2);
    assert.equal(savedStudy.attempts.filter(a=>a.mode==='continuous' && !a.correct).length,1);
    assert.equal(savedStudy.attempts.filter(a=>a.mode==='legacy-tutor').length,1);
    assert.ok(savedStudy.records.some(row=>row.id==='lesson:t1'&&row.value.bookmarked));
    const restoredCount=await page.evaluate(async payload=>{
      await StudyStore.merge(payload);
      await StudyStore.merge(payload);
      return (await StudyStore.snapshot()).attempts.length;
    },savedStudy);
    assert.equal(restoredCount,savedStudy.attempts.length);
    await page.getByRole('link',{name:'Settings',exact:true}).click();
    const studyDownload = page.waitForEvent('download');
    await page.locator('#export').click();
    const studyBackup=JSON.parse(fs.readFileSync(await (await studyDownload).path(),'utf8'));
    assert.equal(studyBackup.continuousStudy.version,1);
    assert.equal(studyBackup.continuousStudy.attempts.length,savedStudy.attempts.length);
    assert.equal(studyBackup.notes[0].body,'Existing notebook entry');
    await page.goto(home+'practice.html?retry=p31');
    await page.locator('#start').click();
    await page.getByText('Question 1',{exact:true}).waitFor();
    const larmor=await page.evaluate(()=>RegistryContent.bank.find(q=>q.id==='p31'));
    const wrongChoice=page.locator('#practiceChoices button').filter({hasText:larmor.options[1][0]});
    await wrongChoice.click();
    for(let level=1;level<=3;level++){
      await page.locator('#practiceHint').click();
      await page.waitForFunction(level=>document.querySelector('#practiceHints').children.length===level,level);
      assert.ok(!(await page.locator('#practiceHints').textContent()).includes(larmor.options[0][0]));
    }
    await page.locator('#hidePracticeHint').click();
    await page.locator('#practiceHints').waitFor({state:'hidden'});
    await page.close();
    const reopened=await context.newPage();
    await reopened.goto(home+'?section=study-center');
    await reopened.getByRole('heading',{name:'Study Dashboard',exact:true}).waitFor();
    await reopened.getByRole('link',{name:/Pulse Sequences.*47 available questions/}).waitFor();
    await reopened.getByRole('link',{name:'Resume Studying',exact:true}).click();
    await reopened.locator('#practiceStem').waitFor();
    assert.equal(await reopened.locator('#practiceStem').textContent(),larmor.stem);
    assert.equal(await reopened.locator('#practiceChoices button').filter({hasText:larmor.options[1][0]}).getAttribute('aria-pressed'),'true');
    await reopened.locator('#checkPractice').click();
    await reopened.getByText('✕ INCORRECT',{exact:true}).waitFor();
    await reopened.locator('#teachPractice').click();
    await reopened.locator('#practiceCorrection').waitFor();
    assert.match(await reopened.locator('#practiceCorrection').textContent(),/Worked calculation/);
    await reopened.getByRole('link',{name:'Open Full Lesson',exact:true}).click();
    await reopened.getByRole('heading',{name:'Precession and Larmor frequency',exact:true}).waitFor();
    await reopened.getByRole('group',{name:'Page history'}).getByRole('button',{name:'Back',exact:true}).click();
    await reopened.locator('#practiceCorrection').waitFor();
    await reopened.getByRole('button',{name:'Return to Original Question',exact:true}).click();
    await reopened.getByText('✕ INCORRECT',{exact:true}).waitFor();
    await reopened.getByRole('group',{name:'Page history'}).getByRole('button',{name:'Forward',exact:true}).click();
    await reopened.locator('#practiceCorrection').waitFor();
    await reopened.getByRole('button',{name:'Return to Original Question',exact:true}).click();
    await reopened.reload();
    await reopened.getByText('✕ INCORRECT',{exact:true}).waitFor();
    const retryAttempts=await reopened.evaluate(async()=>(await StudyStore.snapshot()).attempts.filter(a=>a.mode==='retry'&&a.question==='p31'));
    assert.equal(retryAttempts.length,1);
    assert.deepEqual([retryAttempts[0].correct,retryAttempts[0].hint,retryAttempts[0].hintLevel],[false,true,3]);
    await reopened.goto(home+'brain-atlas.html?region=brain&mode=illustrated');
    await reopened.locator('#platePractice').click();
    const illustrationTarget=await reopened.locator('#quizTarget').textContent();
    await reopened.locator('#quizHint').click();
    await reopened.locator('#quizHint').click();
    await reopened.reload();
    await reopened.locator('#quizTarget').waitFor();
    assert.equal(await reopened.locator('#quizTarget').textContent(),illustrationTarget);
    assert.equal(await reopened.locator('#plateImage').getAttribute('alt'),'Unlabeled anatomy illustration');
    assert.equal(await reopened.locator('.plate-point.hinted').count(),0);
    await reopened.locator('#quizHint').click();
    assert.equal(await reopened.locator('.plate-point.hinted').count(),1);
    await reopened.locator('#quizExit').click();
    await reopened.goto(home+'?section=practice');
    await reopened.locator('#quizBegin').click();
    await reopened.locator('#recallHint').click();
    const recallQuestion=await reopened.locator('#quizQuestion').textContent();
    await reopened.reload();
    assert.equal(await reopened.locator('#quizQuestion').textContent(),recallQuestion);
    assert.match(await reopened.locator('#recallHints').textContent(),/Hint 1/);
    await reopened.goto(home+'practice.html?retry=n10');
    await reopened.locator('#start').click();
    await reopened.waitForFunction(()=>document.querySelector('#practiceImage').naturalWidth>0);
    const marker=await reopened.locator('.mri-marker').getAttribute('data-target');
    assert.ok(marker);
    const aligned=()=>reopened.evaluate(()=>{
      const image=document.querySelector('#practiceImage').getBoundingClientRect();
      const overlay=document.querySelector('.mri-marker').getBoundingClientRect();
      return ['x','y','width','height'].every(key=>Math.abs(image[key]-overlay[key])<1);
    });
    assert.ok(await aligned());
    await reopened.locator('#practiceImageFrame').evaluate(frame=>{
      function pinch(type,width){
        const event=new Event(type,{bubbles:true,cancelable:true});
        Object.defineProperty(event,'touches',{value:[{clientX:0,clientY:0},{clientX:width,clientY:0}]});
        frame.dispatchEvent(event);
      }
      pinch('touchstart',100);pinch('touchmove',200);
    });
    assert.equal(await reopened.locator('#practiceImageZoom').inputValue(),'2');
    await reopened.setViewportSize({width:1180,height:820});
    assert.ok(await aligned());
    assert.equal(await reopened.locator('.mri-marker').getAttribute('data-target'),marker);
    await reopened.goto(home+'practice.html?retry=le-k-img02');
    await reopened.locator('#start').click();
    await reopened.waitForFunction(()=>[...document.querySelectorAll('#practiceImageFrame img')].length===2&&
      [...document.querySelectorAll('#practiceImageFrame img')].every(img=>img.naturalWidth>0));
    assert.deepEqual(await reopened.locator('#practiceImageFrame [data-panel]').evaluateAll(items=>items.map(item=>item.dataset.panel)),['Image A','Image B']);
    await reopened.goto(home+'study-center.html?section=lower&region=hip');
    await reopened.getByRole('heading',{name:'Lower-extremity MRI library'}).waitFor();
    assert.match(await reopened.locator('#lowerStatus').textContent(),/12 of 55/);
    await reopened.locator('#libraryRegion').selectOption('knee');
    assert.match(await reopened.locator('#lowerStatus').textContent(),/23 of 100/);
    await reopened.getByRole('link',{name:'Custom quiz or short timed test'}).click();
    await reopened.getByRole('button',{name:/Start 10-question timed lower-extremity test/}).click();
    await reopened.locator('#questionCount').waitFor();
    assert.equal(await reopened.locator('#questionCount').textContent(),'Question 1 of 10');
    assert.equal(await reopened.locator('#hint').isVisible(),false);
    await reopened.goto(home+'study-center.html?section=sequence');
    await reopened.getByRole('heading',{name:'Sequence Recognition',exact:true}).waitFor();
    await reopened.getByText(/47 questions in this topic/).waitFor();
    await reopened.locator('#start').click();
    const stems=new Set();
    for(let i=0;i<6;i++){
      await reopened.waitForFunction(number=>document.querySelector('#practiceNumber').textContent==='Question '+number,i+1);
      stems.add(await reopened.locator('#practiceStem').textContent());
      const options=reopened.locator('#practiceChoices button');
      await options.first().click();
      for(let option=1;option<await options.count()&&await reopened.locator('#checkPractice').isDisabled();option++){
        await options.nth(option).click();
      }
      await reopened.locator('#checkPractice').click();
      await reopened.locator('#nextPractice').click();
    }
    assert.equal(stems.size,6);
    await reopened.waitForFunction(()=>document.querySelector('#practiceNumber').textContent==='Question 7');
    const savedStem=await reopened.locator('#practiceStem').textContent();
    await reopened.reload();
    await reopened.locator('#practiceStem').waitFor();
    assert.equal(await reopened.locator('#practiceStem').textContent(),savedStem);
    await reopened.goto(home+'study-center.html?section=body&part=hand');
    await reopened.getByRole('heading',{name:'Hand and fingers',exact:true}).waitFor();
    await reopened.waitForFunction(()=>document.querySelector('#bodyPartImages img')?.naturalWidth>0);
    assert.match(await reopened.locator('#bodyPartCoverage').textContent(),/No verified MRI/);
    await reopened.locator('#bodyPart').selectOption('long-bones');
    await reopened.getByRole('heading',{name:'Long bones',exact:true}).waitFor();
    assert.equal(await reopened.locator('#bodyPartImages img').count(),5);
    await reopened.goBack();
    await reopened.getByRole('heading',{name:'Hand and fingers',exact:true}).waitFor();
    await reopened.goto(home+'study-center.html?section=artifact&lesson=shift');
    await reopened.getByRole('heading',{name:'Artifact Academy',exact:true}).waitFor();
    assert.match(await reopened.locator('#artifactText').textContent(),/4.4 pixels/);
    await reopened.locator('#artifactBandwidth').fill('440');
    assert.match(await reopened.locator('#artifactText').textContent(),/1.0 pixels/);
    await reopened.locator('#artifactLesson').selectOption('gibbs');
    await reopened.waitForFunction(()=>document.querySelector('#artifactImageRaster').naturalWidth===600);
    await reopened.locator('#artifactLesson').selectOption('epi');
    await reopened.getByRole('heading',{name:'EPI susceptibility distortion'}).waitFor();
    assert.equal(await reopened.locator('#artifactDemo').isVisible(),false);
    await reopened.getByRole('link',{name:'Try this Fix the Scan case'}).click();
    await reopened.locator('#start').click();
    await reopened.getByText(/Single-shot diffusion images stretch along phase/).waitFor();
    await reopened.locator('#practiceHint').click();
    await reopened.locator('#practiceHints').getByText(/Hint 1/).waitFor();
    await reopened.getByRole('button',{name:'Make the EPI train longer.',exact:true}).click();
    await reopened.locator('#checkPractice').click();
    await reopened.getByText('✕ INCORRECT',{exact:true}).waitFor();
    await reopened.locator('#teachPractice').click();
    await reopened.locator('#practiceCorrection').getByText(/accumulated phase error and distortion/).waitFor();
    await reopened.goto(home+'parameter-lab.html?parameter=te');
    await reopened.getByRole('heading',{name:'MRI Parameter Lab',exact:true}).waitFor();
    assert.equal(await reopened.locator('#parameterChart tbody tr').count(),14);
    assert.match(await reopened.locator('#parameterEffects').textContent(),/Acquisition time↔ Unchanged/);
    await reopened.locator('#parameterDirection').selectOption('down');
    assert.match(await reopened.locator('#parameterEffects').textContent(),/SNR↑ Increase/);
    await reopened.locator('#fixScenario').selectOption('shift');
    await reopened.getByLabel('Bandwidth (Hz/pixel)',{exact:true}).fill('440');
    await reopened.locator('#checkProtocol').click();
    await reopened.getByText(/Target met/).waitFor();
    assert.ok(await reopened.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await reopened.getByRole('link',{name:'Complete this row'}).click();
    await reopened.getByRole('button',{name:'Start chart challenge'}).click();
    await reopened.getByText('Question 1 of 2',{exact:true}).waitFor();
    await reopened.locator('#practiceHint').click();
    await reopened.locator('#practiceHints').getByText(/Hint 1/).waitFor();
    await reopened.getByRole('button',{name:'Decrease',exact:true}).click();
    await reopened.locator('#checkPractice').click();
    await reopened.getByText(/Correct with Hint 1/).waitFor();
    await reopened.reload();
    await reopened.getByText(/Correct with Hint 1/).waitFor();
    await reopened.locator('#nextPractice').click();
    await reopened.getByText('Question 2 of 2',{exact:true}).waitFor();
    await reopened.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Anatomy',exact:true}).click();
    await reopened.locator('summary').filter({hasText:'Lower Extremities'}).click();
    await reopened.getByRole('link',{name:'Knee',exact:true}).click();
    await reopened.getByRole('heading',{name:'Knee MRI Atlas',exact:true}).waitFor();
    await reopened.getByRole('button',{name:'Start MRI quiz',exact:true}).click();
    await reopened.locator('#quizTarget').waitFor();
    assert.equal(await reopened.locator('#structureDrawer').isVisible(),false);
    await reopened.locator('#quizExit').click();
    await reopened.getByRole('group',{name:'Page history'}).getByRole('button',{name:'Back',exact:true}).click();
    await reopened.getByRole('heading',{name:'Body Region Library',exact:true}).waitFor();
    await reopened.getByLabel('Filter by organ system').selectOption({label:'Nervous'});
    await reopened.getByRole('link',{name:/^Thalamus/}).click();
    await reopened.getByRole('heading',{name:'Left Thalamus',exact:true}).waitFor();
    await reopened.getByRole('group',{name:'Page history'}).getByRole('button',{name:'Back',exact:true}).click();
    await reopened.getByRole('link',{name:/^Thalamus/}).waitFor();
    await reopened.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Study Center',exact:true}).click();
    await reopened.getByRole('link',{name:/^MRI Safety.*available questions/}).click();
    assert.equal(await reopened.locator('#subject').inputValue(),'Safety');
    await reopened.goto(home+'?section=study-center');
    await reopened.getByRole('link',{name:/^Lower Extremity.*71 available questions/}).waitFor();
    assert.equal(await reopened.getByText('Browse lower-extremity regions',{exact:true}).count(),0);
    await reopened.getByRole('link',{name:/^Lower Extremity.*71 available questions/}).click();
    await reopened.getByRole('link',{name:'Knee · 23',exact:true}).waitFor();
    await reopened.getByRole('link',{name:'Study Center',exact:true}).click();
    await reopened.getByRole('link',{name:/^Pathology.*21 available questions/}).click();
    await reopened.getByText(/21 questions in this topic/).waitFor();
    await reopened.getByRole('link',{name:'Clinical',exact:true}).click();
    await reopened.getByRole('link',{name:/^Patient Positioning/}).click();
    await reopened.getByText(/23 questions in this topic/).waitFor();
    assert.equal(await reopened.locator('.primary-links [aria-current=page]').textContent(),'Clinical');
    await reopened.getByRole('button',{name:'Start practice',exact:true}).click();
    const cases=new Set();
    for(let n=1;n<=4;n++){
      await reopened.getByText('Question '+n,{exact:true}).waitFor();
      cases.add(await reopened.locator('#practiceStem').textContent());
      await reopened.locator('#practiceChoices button').first().click();
      await reopened.locator('#checkPractice').click();
      await reopened.locator('#nextPractice').click();
    }
    assert.equal(cases.size,4);
    await reopened.getByRole('link',{name:'Return to Clinical Dashboard'}).click();
    await reopened.getByRole('link',{name:/^MRI Safety/}).click();
    await reopened.getByText(/29 questions in this topic/).waitFor();
    await reopened.locator('#clinicalLimit').selectOption('3');
    await reopened.getByRole('button',{name:'Start practice',exact:true}).click();
    await reopened.getByText('Question 1 of 3',{exact:true}).waitFor();
    await reopened.getByRole('link',{name:'Anatomy',exact:true}).click();
    const head=reopened.locator('summary').filter({hasText:'Brain & Head'});
    if(!await reopened.getByRole('link',{name:'Intracranial MRA',exact:true}).isVisible()) await head.click();
    await reopened.getByRole('link',{name:'IAC / cerebellopontine angle',exact:true}).click();
    await reopened.getByText('Real MRI not yet available. Anatomy text reference.',{exact:true}).waitFor();
    await reopened.getByRole('group',{name:'Page history'}).getByRole('button',{name:'Back',exact:true}).click();
    await reopened.getByRole('link',{name:'Intracranial MRA',exact:true}).click();
    await reopened.getByRole('heading',{name:'Intracranial MRA',exact:true}).waitFor();
    await reopened.getByText(/Loaded chris_MRA/).waitFor();
    assert.ok(await reopened.locator('#view').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((x,i)=>i%4===0&&x>50)));
    await reopened.locator('#projection').selectOption('slice');
    assert.equal(await reopened.locator('#slice').isEnabled(),true);
    await reopened.close();
    assert.deepEqual(errors,[]);
    console.log(engine + ' verified navigation, offline MRI, adaptive practice, Academy, and backups.');
  } finally {
    await browser?.close();
    server.kill();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
