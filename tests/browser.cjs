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
    async function assistedPractice(manifestPath) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath));
      await page.locator('#practice').click();
      const prompt = await page.locator('#feedback').textContent();
      const id = Object.keys(manifest.labels).find(id => prompt === 'Find '+manifest.labels[id].name+'.');
      assert.ok(id, prompt);
      const [x,y,z] = manifest.anchors[id];
      await page.locator('#practiceHint').click();
      assert.match(await page.locator('#feedback').textContent(), /assisted recall/);
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
      assert.equal(rendered.highlight,true);
      assert.match(await page.locator('#views h2').first().textContent(),new RegExp(' '+(z+1)+' /'));
      const bounds=await view.boundingBox();
      await view.click({position:{x:bounds.width*rendered.x,y:bounds.height*rendered.y}});
      assert.match(await page.locator('#feedback').textContent(),/with a hint/);
      const attempt=await page.evaluate(()=>JSON.parse(localStorage.getItem('mri-study-lab-review-v1'))[0]);
      assert.equal(attempt.ok,false);
      assert.equal(attempt.correct,true);
      assert.equal(attempt.assisted,true);
    }
    await page.goto(home);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.deepEqual(errors,[]);
    await page.getByRole('button',{name:'Physics Sandbox'}).click();
    await page.locator('#sField').selectOption('3');
    assert.match(await page.locator('#larmor').textContent(), /127.73 MHz/);
    await page.locator('#sTR').fill('3000');
    assert.match(await page.locator('#relaxationSummary').textContent(), /TR 3000 ms/);
    const tinyPNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL5sAAAAASUVORK5CYII=';
    await page.getByRole('button',{name:'Protocol Builder'}).click();
    await page.locator('#protoImageFile').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from(tinyPNG,'base64')});
    await page.waitForFunction(()=>new Promise(resolve=>{
      const request=indexedDB.open('mri-study-lab-images',1);
      request.onsuccess=()=>{
        const db=request.result, get=db.transaction('refs').objectStore('refs').get('protocol-ref');
        get.onsuccess=()=>{db.close();resolve(get.result?.size>0);};
      };
    }));
    assert.match(await page.locator('#protoCoverage').textContent(), /60.0 mm/);
    await page.locator('#protoNew').click();
    assert.match(await page.locator('#protoInstruction').textContent(),/axial brain stack/);
    await page.getByRole('button',{name:'Slice Planner'}).click();
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
    await page.getByRole('link',{name:'Real Brain Atlas'}).click();
    await page.locator('#load').click();
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    assert.equal(await page.locator('canvas').count(),3);
    await page.locator('#search').fill('Left Thalamus');
    await page.getByRole('button',{name:'Left Thalamus',exact:true}).click();
    await page.getByRole('heading',{name:'Left Thalamus'}).waitFor();
    await page.locator('#notes').fill('Atlas observation');
    await page.locator('#save').click();
    await page.locator('#ink').click();
    const canvas = page.getByRole('img',{name:'Axial MRI slice'});
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+20,{steps:5});
    await page.mouse.up();
    assert.equal(await page.locator('#undo').isEnabled(),true);
    await page.getByRole('link',{name:'Cervical Spine Atlas',exact:true}).click();
    await page.getByRole('heading',{name:'Cervical Spine Atlas'}).waitFor();
    await page.locator('#load').click();
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.getByRole('button',{name:'C2–C3 disc',exact:true}).click();
    await page.getByRole('heading',{name:'C2–C3 disc',exact:true}).waitFor();
    await assistedPractice('atlas/spine/manifest.json');
    await page.getByRole('link',{name:'Knee MRI Atlas',exact:true}).click();
    await page.getByRole('heading',{name:'Knee MRI Atlas'}).waitFor();
    await page.locator('#load').click();
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.getByRole('button',{name:'Femoral cartilage',exact:true}).click();
    await page.getByRole('heading',{name:'Femoral cartilage',exact:true}).waitFor();
    await assistedPractice('atlas/knee/manifest.json');
    await page.getByRole('link',{name:'Cardiac MRI Atlas',exact:true}).click();
    await page.getByRole('heading',{name:'Cardiac MRI Atlas'}).waitFor();
    await page.locator('#load').click();
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.getByRole('button',{name:'Left atrium',exact:true}).click();
    await page.getByRole('heading',{name:'Left atrium',exact:true}).waitFor();
    await new Promise(resolve => { server.once('exit',resolve);server.kill(); });
    await page.goto(home + 'brain-atlas.html?region=cardiac',{waitUntil:'domcontentloaded'});
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await assistedPractice('atlas/cardiac/manifest.json');
    await page.goto(home + 'brain-atlas.html?region=knee',{waitUntil:'domcontentloaded'});
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.getByRole('button',{name:'Femur',exact:true}).click();
    await page.getByRole('heading',{name:'Femur',exact:true}).waitFor();
    await page.goto(home + 'brain-atlas.html?region=spine',{waitUntil:'domcontentloaded'});
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.getByRole('button',{name:'C7–T1 disc',exact:true}).click();
    await page.getByRole('heading',{name:'C7–T1 disc',exact:true}).waitFor();
    await page.goto(home + 'brain-atlas.html', {waitUntil:'domcontentloaded'});
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.locator('#search').fill('Left Thalamus');
    await page.getByRole('button',{name:'Left Thalamus',exact:true}).click();
    assert.equal(await page.locator('#notes').inputValue(),'Atlas observation');
    assert.equal(await page.locator('#undo').isEnabled(),true);
    await page.getByRole('link',{name:'MRI Study Lab',exact:true}).click();
    await page.getByText('Available offline',{exact:false}).waitFor({timeout:60000});
    for (const region of ['cspine','knee','brain']) {
      await page.locator('#region').selectOption(region);
      await page.getByText('Available offline',{exact:false}).waitFor({timeout:60000});
    }
    await page.getByRole('link',{name:'Study Center'}).click();
    assert.equal(await page.locator('#system option').count(),11);
    await page.locator('#system').selectOption({label:'Urinary'});
    await page.getByRole('heading',{name:'Kidney',exact:true}).waitFor();
    await page.locator('#organNote').fill('Kidney study note');
    await page.locator('#organSave').click();
    await page.getByRole('button',{name:'Artifact Simulator'}).click();
    const phantom=page.locator('#phantom');
    const baseline=await phantom.evaluate(canvas=>canvas.toDataURL());
    await page.locator('#severity').fill('90');
    assert.notEqual(await phantom.evaluate(canvas=>canvas.toDataURL()),baseline);
    await page.getByRole('button',{name:'Virtual Clinical Rotation'}).click();
    for (const choice of [1,0,2,0,1]) {
      await page.locator('#choices button').nth(choice).click();
      await page.locator('#next').click();
    }
    assert.match(await page.locator('#stem').textContent(),/5 of 5/);
    await page.getByRole('button',{name:'My Mastery'}).click();
    assert.match(await page.locator('#masteryRows').textContent(),/Virtual Clinical Rotation5 \/ 50/);
    await page.getByRole('link',{name:'MRI Study Lab',exact:true}).click();
    await page.getByRole('button',{name:'Backup & Help'}).click();
    const downloaded = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloaded;
    const backup = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backup.referenceImage?.base64,tinyPNG,await page.locator('#backupStatus').textContent());
    await page.getByRole('button',{name:'Protocol Builder'}).click();
    await page.locator('#protoClearImage').click();
    await page.getByRole('button',{name:'Backup & Help'}).click();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.getByText('Reference image restored.',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Protocol Builder'}).click();
    assert.match(await page.locator('#protoImg').getAttribute('src'),/^blob:/);
    assert.equal(backup.notes[0].body,'Existing notebook entry');
    assert.equal(backup.scanNotes['mri.scan.note.cerebra1.91'],'Atlas observation');
    assert.equal(Object.keys(backup.drawings).length,1);
    assert.equal(backup.scanNotes['mri.scan.note.system.9'],'Kidney study note');
    assert.equal(backup.history.filter(attempt=>attempt.topic==='training:rotation').length,5);
    assert.deepEqual(errors,[]);
    console.log(engine + ' verified GitHub Pages navigation, atlas download and offline return, notes, ink, and backup.');
  } finally {
    await browser?.close();
    server.kill();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
