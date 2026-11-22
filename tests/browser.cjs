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
    await page.goto(home);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.getByRole('button',{name:'Physics Sandbox'}).click();
    await page.locator('#sField').selectOption('3');
    assert.match(await page.locator('#larmor').textContent(), /127.73 MHz/);
    await page.getByRole('button',{name:'Slice Planner'}).click();
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
    await new Promise(resolve => { server.once('exit',resolve);server.kill(); });
    await page.goto(home + 'brain-atlas.html', {waitUntil:'domcontentloaded'});
    await page.getByText('MRI and labels saved for offline use.',{exact:false}).waitFor({timeout:60000});
    await page.locator('#search').fill('Left Thalamus');
    await page.getByRole('button',{name:'Left Thalamus',exact:true}).click();
    assert.equal(await page.locator('#notes').inputValue(),'Atlas observation');
    assert.equal(await page.locator('#undo').isEnabled(),true);
    await page.getByRole('link',{name:'MRI Study Lab',exact:true}).click();
    await page.getByRole('button',{name:'Backup & Help'}).click();
    const downloaded = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloaded;
    const backup = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backup.notes[0].body,'Existing notebook entry');
    assert.equal(backup.scanNotes['mri.scan.note.cerebra1.91'],'Atlas observation');
    assert.equal(Object.keys(backup.drawings).length,1);
    assert.deepEqual(errors,[]);
    console.log(engine + ' verified GitHub Pages navigation, atlas download and offline return, notes, ink, and backup.');
  } finally {
    await browser?.close();
    server.kill();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
