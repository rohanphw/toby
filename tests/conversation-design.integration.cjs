/** Isolated screenshot/interaction fixture for the approved conversation design. */
const {app,BrowserWindow}=require('electron');
const path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
app.setPath('userData',path.resolve('.local/conversation-design-data-'+process.pid));
app.whenReady().then(async()=>{
 app.dock?.hide();
 const window=new BrowserWindow({show:false,width:1280,height:762,webPreferences:{preload:path.resolve('tests/fixtures/renderer-preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 const errors=[];window.webContents.on('console-message',(_event,...args)=>{const info=args[0];if(typeof info==='object'&&info.level==='error')errors.push(info.message);});
 const timeout=setTimeout(()=>{console.error('Conversation design check timed out');window.destroy();app.exit(1);},30000);
 const run=code=>window.webContents.executeJavaScript(code),settle=async()=>{await run('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))))');await new Promise(r=>setTimeout(r,240));};
 const capture=async(name,clip)=>{if(process.env.TOBY_CAPTURE_UI!=='1')return;await fs.mkdir('.local/verification/1.0.24',{recursive:true});const image=await window.webContents.capturePage(clip),size=image.getSize();await fs.writeFile('.local/verification/1.0.24/'+name+'.png',image.toPNG());console.log('DESIGN_CAPTURE',JSON.stringify({name,pixels:size,clip}));};
 try{
  await window.loadFile(path.resolve('out/renderer/index.html'));
  await run(`(async()=>{
   const a=await window.toby.saveAgent({name:'Toby',personality:'',specialization:'Team coordinator',provider:'openai',model:'fixture-model',avatar:'🦊'});
   const b=await window.toby.saveAgent({name:'Jules',personality:'',specialization:'Research',provider:'openai',model:'fixture-model',avatar:'🌱'});
   const g=await window.toby.saveGroup({name:'Project desk',instructions:'A shared space for the team.',members:[a.id,b.id]});await window.toby.setPreferences({onboardingComplete:true});
   await new Promise(r=>setTimeout(r,50));[...document.querySelectorAll('.group-row')].find(n=>n.textContent.includes('Project desk')).click();
   const t=new Date();t.setHours(10,14,0,0);window.__design={a,b,g,t:t.getTime()};
   const add=(id,senderId,text,minute,replyTo)=>window.fixture.message({id,chatId:g.id,senderId,role:senderId==='user'?'user':'assistant',text,createdAt:t.getTime()+minute*60000,status:'done',audience:'public',replyTo});
   add('design-human','user','hey guys',0);
   add('design-jules',b.id,'Hey. I’m here.',1,'design-human');
   add('design-toby',a.id,'Hey. What do you need?',3,'design-human');
   add('design-status',a.id,'@Jules — status check. What are you working on right now?',4);
   add('design-final',b.id,'@Toby Nothing in progress. I answered the hello and I’m free.',5,'design-status');
   window.fixture.refresh();
  })()`);await settle();await run('document.querySelector(".transcript").scrollTop=0');await settle();
  await run(`(()=>{const jules=document.getElementById('message-design-jules'),toby=document.getElementById('message-design-toby');if(!jules.classList.contains('message-local-reply')||!toby.classList.contains('message-local-reply'))throw Error('Replies to the same parent do not share a local sibling group');if(jules.getBoundingClientRect().left!==toby.getBoundingClientRect().left)throw Error('Sibling replies are indented differently');if(jules.querySelector('.message-reference')||toby.querySelector('.message-reference'))throw Error('Sibling reply repeats its parent quote');if(jules.dataset.replyTarget!=='design-human'||toby.dataset.replyTarget!=='design-human')throw Error('Sibling relationships lost their actual parent');})()`);
  const bounds=await run(`(()=>{const r=document.querySelector('.conversation').getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};})()`);
  await capture('approved-conversation',bounds);await capture('workspace-wide');
  for(const [width,height] of [[1280,800],[960,640]]){
   window.setSize(width,height);await settle();
   const geometry=await run(`(()=>{const input=document.querySelector('.composer textarea'),rect=input.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight||rect.left<0||rect.right>innerWidth)throw Error('Composer clipped');if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal overflow');return {width:innerWidth,height:innerHeight,messageCount:document.querySelectorAll('.message').length,composer:rect.toJSON()};})()`);
   await capture('conversation-'+width);console.log('CONVERSATION_VIEWPORT_PASS',JSON.stringify(geometry));
  }
  const longText=['## Release checks','','1. Verify installation and subscription connection.','2. Confirm shared conversation context survives restart.','3. Keep a recoverable previous build.','','A longer explanation should remain readable without widening the conversation or hiding controls. '.repeat(24),'','`local-only`'].join('\n');
  await run(`(()=>{const {a,g,t}=window.__design;window.fixture.message({id:'design-long',chatId:g.id,senderId:a.id,role:'assistant',text:${JSON.stringify(longText)},createdAt:t+8*60000,status:'done',audience:'public',replyTo:'design-human'});window.fixture.refresh();})()`);await settle();
  await run('document.querySelector(".transcript").scrollTop=document.querySelector(".transcript").scrollHeight');await settle();await capture('long-reply-960');
  assert.equal(await run('document.documentElement.scrollWidth>innerWidth'),false);
  assert.deepEqual(errors,[]);console.log('CONVERSATION_DESIGN_PASS: approved transcript, two responsive sizes, long reply and no renderer errors');
  clearTimeout(timeout);window.destroy();app.exit(0);
 }catch(e){console.error(e);clearTimeout(timeout);window.destroy();app.exit(1);}
});
