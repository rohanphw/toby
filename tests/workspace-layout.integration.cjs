const {app,BrowserWindow}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
app.setPath('userData',path.resolve('.local/layout-data-'+process.pid));
app.whenReady().then(async()=>{
 app.dock?.hide();
 const window=new BrowserWindow({show:false,width:1280,height:800,titleBarStyle:'hiddenInset',trafficLightPosition:{x:20,y:20},webPreferences:{preload:path.resolve('tests/fixtures/renderer-preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 const timeout=setTimeout(()=>{console.error('Workspace layout check timed out');window.destroy();app.exit(1);},30000);
 try{
  await window.loadFile(path.resolve('out/renderer/index.html'));
  await window.webContents.insertCSS('* { animation: none !important; transition: none !important; }');
  await window.webContents.executeJavaScript(`(async()=>{
   const api=window.toby;
   const first=await api.saveAgent({name:'Toby',personality:'Thoughtful and direct',specialization:'Team coordinator',provider:'openai',model:'fixture-model',avatar:'toby'});
   const second=await api.saveAgent({name:'Riley',personality:'',specialization:'Research',provider:'openai',model:'fixture-model',avatar:'🧭'});
   const third=await api.saveAgent({name:'Maya',personality:'',specialization:'Engineering',provider:'openai',model:'fixture-model',avatar:'🧩'});
   await api.setPreferences({onboardingComplete:true});
   const group=await api.saveGroup({name:'Release review',instructions:'Review the release',members:[first.id,second.id,third.id]});
   await api.send(first.id,'Help me get this release ready to test.');
   window.fixture.message({id:'fixture-answer',chatId:first.id,senderId:first.id,role:'assistant',text:'The chat changes are ready for review. I’ll ask before creating a specialist or taking an action that needs your permission.',createdAt:Date.now(),status:'done'});
   window.fixture.message({id:'riley-preview',chatId:second.id,senderId:second.id,role:'assistant',text:'The provider review is complete.',createdAt:Date.now(),status:'done'});
   window.fixture.message({id:'maya-preview',chatId:third.id,senderId:third.id,role:'assistant',text:'I checked the release checklist.',createdAt:Date.now(),status:'done'});
   window.fixture.message({id:'group-preview',chatId:group.id,senderId:first.id,role:'assistant',text:'The team is ready to review.',createdAt:Date.now(),status:'done'});
   window.fixture.approval({id:'layout-permission',chatId:first.id,agentId:first.id,title:'Create a specialist',permission:'agents',detail:'Add Riley to your team using your current Grok model.'});
  })()`);
  const check=async()=>window.webContents.executeJavaScript(`(()=>{
   const assert=(condition,message)=>{if(!condition)throw Error(message)};
   const approval=document.querySelector('.approval'),composer=document.querySelector('.composer-area'),input=document.querySelector('.composer textarea');
   assert(approval&&composer.contains(approval),'Approval is outside the composer area');
   const card=approval.getBoundingClientRect(),header=document.querySelector('.chat-header').getBoundingClientRect();
   assert(card.top>header.bottom&&card.bottom<=input.getBoundingClientRect().top&&input.getBoundingClientRect().bottom<=innerHeight,'Approval and composer must stay visible without overlap');
   assert(card.height<300,'Approval is too tall');
   for(const button of approval.querySelectorAll('button')){
    const rect=button.getBoundingClientRect();
    assert(rect.left>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,'Permission controls clipped');
    assert(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('button')===button,'Permission controls covered by inspector');
   }
   assert(!document.querySelector('.approval-stack'),'Legacy top banner remains');assert(!document.querySelector('.onboarding'),'Completed onboarding overlay remains');
   assert(!document.querySelector('.pinned-chat'),'An unpinned agent was featured');assert([...document.querySelectorAll('.roster-agents .agent-row strong')].some(name=>name.textContent==='Toby'),'Unpinned Toby is missing from the ordinary roster');
   assert(document.querySelectorAll('.group-avatar-stack .avatar').length>=2,'Group member artwork missing');
   const shell=getComputedStyle(document.querySelector('.app-shell')),sidebar=document.querySelector('.sidebar').getBoundingClientRect(),conversation=document.querySelector('.conversation').getBoundingClientRect();
   assert(shell.padding==='0px'&&shell.gap==='0px'&&sidebar.left===0&&sidebar.right===conversation.left,'Workspace is split into inset slabs');
   for(const selector of ['.sidebar','.conversation','.context']){
    const node=document.querySelector(selector);if(!node)continue;
    const style=getComputedStyle(node),channels=style.backgroundColor.match(/[0-9]+/g).slice(0,3).map(Number);
    assert(Math.max(...channels)-Math.min(...channels)===0,'Green tint remains in '+selector);
    assert(style.borderRadius==='0px','Rounded full-height panel remains in '+selector);
   }
   assert(!document.querySelector('.avatar img'),'App logo still used as an agent avatar');
   assert(document.documentElement.scrollWidth<=innerWidth,'Horizontal overflow');
   return {width:innerWidth,height:innerHeight,approvalHeight:card.height,approvalWidth:card.width,buttonsReachable:true};
  })()`);
  for(const [width,height,inspector] of [[1280,800,false],[960,640,true]]){
   window.setSize(width,height);
   if(inspector)await window.webContents.executeJavaScript(`document.querySelector('[aria-label="Workspace details"]').click()`);
   await new Promise(resolve=>setTimeout(resolve,250));
   console.log('WORKSPACE_LAYOUT_PASS',JSON.stringify(await check()));
   if(process.env.TOBY_CAPTURE_UI==='1'){
    await window.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))))');
    const image=await window.webContents.capturePage();
    await fs.mkdir('.local/verification',{recursive:true});
    await fs.writeFile(path.resolve('.local/verification/workspace-'+width+'.png'),image.toPNG());
   }
  }
  const run=code=>window.webContents.executeJavaScript(code);
  const settle=()=>new Promise(resolve=>setTimeout(resolve,240));
  const capture=async name=>{await settle();await run('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))))');if(process.env.TOBY_CAPTURE_UI==='1')await fs.writeFile('.local/verification/'+name+'.png',(await window.webContents.capturePage()).toPNG());};
  window.setSize(1280,800);await run('window.fixture.approvals([])');await settle();
  await run(`(()=>{[...document.querySelectorAll('.sidebar-bottom button')].find(button=>button.textContent.trim()==='Settings').click();})()`);await capture('settings-1280');
  await run(`(()=>{[...document.querySelectorAll('.context-tabs button')].find(button=>button.textContent==='Memory').click();})()`);await settle();
  await run(`(()=>{[...document.querySelectorAll('.context-body button')].find(button=>button.textContent==='Add memory').click();})()`);await capture('memory-1280');
  await run(`document.querySelector('[aria-label="Edit agent"]').click()`);await capture('agent-editor-1280');await run(`(()=>{const button=document.querySelector('[role="dialog"] .primary'),rect=button.getBoundingClientRect();if(rect.bottom>innerHeight||rect.top<0)throw Error('Agent Save is clipped');if(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('button')!==button)throw Error('Agent Save is covered');})()`);
  await run(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await settle();
  await run(`document.querySelector('.sidebar .group-row').click()`);await settle();await run(`document.querySelector('[aria-label="Edit group"]').click()`);await capture('group-editor-1280');await run(`(()=>{const button=document.querySelector('[role="dialog"] .primary'),rect=button.getBoundingClientRect();if(rect.bottom>innerHeight||rect.top<0)throw Error('Group Save is clipped');})()`);
  await run(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await settle();
  await run(`document.querySelector('[aria-label="Close workspace details"]').click()`);await settle();
  await run(`(async()=>{const agent=await window.toby.saveAgent({name:'Jules',personality:'',specialization:'Writing',provider:'openai',model:'fixture-model',avatar:'🌱'});window.__emptyAgent=agent.id;})()`);await settle();
  await run(`(()=>{[...document.querySelectorAll('.sidebar .agent-row')].find(row=>row.querySelector('strong')?.textContent==='Jules').click();})()`);await capture('empty-1280');
  await run(`(()=>{if(!document.querySelector('.conversation-empty'))throw Error('Empty state missing');window.__persistentComposer=document.querySelector('.composer textarea');const starters=document.querySelector('.conversation-starters').getBoundingClientRect(),form=document.querySelector('.composer').getBoundingClientRect();if(starters.top<form.bottom)throw Error('Suggestions must follow composer');const greeting=document.querySelector('.empty-conversation').getBoundingClientRect(),input=document.querySelector('.composer-area').getBoundingClientRect();if(input.top-greeting.bottom>45)throw Error('Greeting detached from composer');})()`);
  window.setSize(960,640);await capture('empty-960');
  window.setSize(1280,800);await run(`(async()=>{await window.toby.setChatPinned(window.__emptyAgent,true);await window.toby.setChatPinned((await window.toby.snapshot()).groups[0].id,true);})()`);await capture('pins-1280');
  await run(`(()=>{if(document.querySelectorAll('.pinned-chat').length!==2)throw Error('Explicit pins not projected');if(document.querySelector('.composer textarea')!==window.__persistentComposer)throw Error('Pinning remounted draft input');})()`);
  console.log('WORKSPACE_SCREENS_PASS: settings, progressive memory editor, agent/group editors, centered empty chat, explicit pin tiles, persistent composer');
  clearTimeout(timeout);window.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);window.destroy();app.exit(1);}
});
