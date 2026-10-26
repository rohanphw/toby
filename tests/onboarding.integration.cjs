const {app,BrowserWindow}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
app.setPath('userData',path.resolve('.local/onboarding-story-'+process.pid));
app.whenReady().then(async()=>{
 app.dock?.hide();
 const window=new BrowserWindow({show:false,width:1280,height:800,titleBarStyle:'hiddenInset',webPreferences:{preload:path.resolve('tests/fixtures/renderer-preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 const timeout=setTimeout(()=>{console.error('Onboarding check timed out');window.destroy();app.exit(1);},30000);
 const run=async code=>{const result=await window.webContents.executeJavaScript(`(async()=>{try{return {ok:true,value:await (${code})};}catch(error){return {ok:false,error:error.message};}})()`);if(!result.ok)throw Error(result.error);return result.value;};
 const pause=()=>new Promise(resolve=>setTimeout(resolve,120));
 const capture=async name=>{if(process.env.TOBY_CAPTURE_UI==='1'){await new Promise(resolve=>setTimeout(resolve,220));await run('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))))');await fs.mkdir('.local/verification',{recursive:true});await fs.writeFile('.local/verification/'+name+'.png',(await window.webContents.capturePage()).toPNG());}};
 try{
  await window.loadFile(path.resolve('out/renderer/index.html'));await run('document.fonts.ready.then(()=>true)');await pause();
  const initial=await run(`(()=>{const intro=document.querySelector('.welcome-intro'),form=document.querySelector('.onboarding .agent-form'),cta=document.querySelector('.welcome-start');if(!intro||!intro.getBoundingClientRect().height||form.getBoundingClientRect().height)throw Error('Welcome must precede every setup field');if(!document.querySelector('.app-shell').inert)throw Error('Workspace is interactive behind onboarding');if(![...document.fonts].some(font=>font.family.includes('Nunito')&&font.status==='loaded'))throw Error('Bundled typeface not loaded');if(!document.querySelector('.intro-idea').getAnimations().some(animation=>animation.effect.getTiming().iterations===Infinity))throw Error('Welcome scene is not looping');return {transform:getComputedStyle(document.querySelector('.intro-idea')).transform};})()`);
  await new Promise(resolve=>setTimeout(resolve,400));
  const moved=await run(`getComputedStyle(document.querySelector('.intro-idea')).transform`);if(moved===initial.transform)throw Error('Welcome loop is not progressing');
  for(const [width,height] of [[1280,800],[960,640]]){
   window.setSize(width,height);await pause();
   await run(`(()=>{const button=document.querySelector('.welcome-start'),rect=button.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)throw Error('Get started is clipped');document.querySelector('.intro-scene').getAnimations({subtree:true}).forEach(animation=>{animation.pause();animation.currentTime=6000;});})()`);
   await capture('welcome-'+width);
  }
  await run(`window.fixture.setup({phase:'downloading',progress:42,downloadedBytes:420,totalBytes:1000})`);await pause();await run(`(()=>{const button=document.querySelector('.welcome-start'),rect=button.getBoundingClientRect();if(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('button')!==button)throw Error('Download status covers Get started');})()`);await run(`window.fixture.setup(undefined)`);
  await run(`document.querySelector('.welcome-start').click()`);await pause();
  await run(`(()=>{const field=document.querySelector('[aria-label="Personality"]');window.__profileNode=field;field.value='Patient and curious';field.dispatchEvent(new Event('input',{bubbles:true}));if(document.querySelector('.onboarding [aria-label="Specialization"]').value)throw Error('Optional specialization must start blank');})()`);
  await capture('profile-960');
  await run(`document.querySelector('.onboarding-back').click()`);await pause();await run(`document.querySelector('.welcome-start').click()`);await pause();
  await run(`(()=>{const field=document.querySelector('.onboarding [aria-label="Personality"]');if(field!==window.__profileNode||field.value!=='Patient and curious')throw Error('Welcome navigation remounted or lost draft');document.querySelector('.onboarding .agent-form').requestSubmit();})()`);await pause();
  await run(`(()=>{if(!document.querySelector('#setup-title').textContent.includes('Connect'))throw Error('Step title did not follow setup');if(!document.querySelector('.onboarding .agent-form .primary').disabled)throw Error('Model selection no longer required');})()`);
  await capture('connection-960');
  await run(`(()=>{const model=document.querySelector('.onboarding .agent-form select');model.value='fixture-model';model.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.onboarding .agent-form').requestSubmit();})()`);await pause();
  await capture('permissions-960');
  await run(`(()=>{if(!document.querySelector('#setup-title').textContent.includes('room to work'))throw Error('Access step missing');if(!document.querySelector('.access-choices [value="full"]').checked)throw Error('Full access not offered as initial choice');const button=document.querySelector('.onboarding .agent-form .primary'),rect=button.getBoundingClientRect();if(rect.bottom>innerHeight||rect.top<0)throw Error('Access CTA clipped '+JSON.stringify({top:rect.top,bottom:rect.bottom,height:innerHeight}));if(document.querySelector('.onboarding-brand'))throw Error('Top-left onboarding brand remains');const page=document.querySelector('.story-onboarding');if(page.scrollHeight>page.clientHeight+1)throw Error('Access setup requires scrolling '+JSON.stringify({height:page.clientHeight,content:page.scrollHeight}));})()`);
  await capture('permissions-960');
  window.webContents.debugger.attach('1.3');await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await run(`document.querySelector('.onboarding-back').click()`);await pause();
  await run(`(()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)throw Error('Reduced motion preference not applied');if(getComputedStyle(document.querySelector('.intro-idea')).animationName!=='none')throw Error('Intro animation ignores reduced motion');})()`);
  window.webContents.debugger.detach();
  console.log('ONBOARDING_STORY_PASS: welcome before fields; bundled font; progressing loop; CTA reachability at 1280/960; persistent setup draft; model gate; reduced motion');
  clearTimeout(timeout);window.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);window.destroy();app.exit(1);}
});
