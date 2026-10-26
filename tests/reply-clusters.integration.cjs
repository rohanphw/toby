/** Real renderer geometry checks; isolated fixture data, no providers or screenshots. */
const {app,BrowserWindow}=require('electron');
const path=require('node:path');
app.setPath('userData',path.resolve('.local/reply-clusters-data-'+process.pid));
app.whenReady().then(async()=>{
 app.dock?.hide();
 const window=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{preload:path.resolve('tests/fixtures/renderer-preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 const timeout=setTimeout(()=>{console.error('Reply cluster check timed out');window.destroy();app.exit(1);},30000);
 const run=async fn=>{
  const result=await window.webContents.executeJavaScript(`Promise.resolve().then(${fn.toString()}).catch(error=>({failure:error.message}))`);
  if(result?.failure)throw Error(result.failure);
  return result;
 };
 const settle=()=>run(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))));
 try{
  await window.loadFile(path.resolve('out/renderer/index.html'));
  await run(async()=>{
   const toby=await window.toby.saveAgent({name:'Toby',personality:'',specialization:'',provider:'openai',model:'fixture-model'});
   const jules=await window.toby.saveAgent({name:'Jules',personality:'',specialization:'',provider:'openai',model:'fixture-model',avatar:'🌱'});
   const group=await window.toby.saveGroup({name:'Reply geometry',instructions:'',members:[toby.id,jules.id]});
   await window.toby.setPreferences({onboardingComplete:true});
   await new Promise(resolve=>setTimeout(resolve,50));
   [...document.querySelectorAll('.group-row')].find(row=>row.textContent.includes('Reply geometry')).click();
   const start=new Date(2026,9,27,10,14).getTime();
   window.__replyFixture={toby,jules,group,start};
   const add=(id,senderId,text,offset,replyTo)=>window.fixture.message({id,chatId:group.id,senderId,role:senderId==='user'?'user':'assistant',text,createdAt:start+offset,status:'done',audience:'public',replyTo});
   add('design-human','user','cluster source: hey guys',0);
   add('design-jules',jules.id,'cluster sibling: Hey. I’m here.',60_000,'design-human');
   add('jules-more',jules.id,'A grouped continuation.',60_001,'design-human');
   add('design-toby',toby.id,'cluster sibling: Hey. What do you need?',180_000,'design-human');
   add('toby-more',toby.id,'The final grouped continuation.',180_001,'design-human');
   window.fixture.refresh();
   window.__composer=document.querySelector('.composer textarea');
   window.__assertReplyGeometry=()=>{
    const assert=(value,message)=>{if(!value)throw Error(message)};
    const near=(a,b,message)=>assert(Math.abs(a-b)<1,message+': '+a+' / '+b);
    const ids=['design-human','design-jules','jules-more','design-toby','toby-more'];
    const rows=ids.map(id=>document.getElementById('message-'+id));
    assert([...document.querySelectorAll('.message')].slice(0,5).map(row=>row.id).join(',')===ids.map(id=>'message-'+id).join(','),'Reply decoration reordered source chronology');
    const parentLeft=rows[0].getBoundingClientRect().left;
    for(const row of rows.slice(1)){
     near(row.getBoundingClientRect().left,parentLeft+44,'Every child keeps one shallow indent');
     assert(row.dataset.replyTarget==='design-human'&&!row.querySelector('.message-reference'),'Sibling lost its actual parent or repeated its quote');
    }
    for(const row of [rows[2],rows[4]])assert(row.classList.contains('message-grouped')&&!row.querySelector('.message-heading,.avatar,.reply-connector'),'Same-author continuation repeated its identity');
    for(let index=0;index<3;index++){
     const stem=rows[index].querySelector('.reply-stem');
     assert(stem,'Missing shared stem through row '+index);
     const rect=stem.getBoundingClientRect(),next=rows[index+1].getBoundingClientRect();
     near(rect.left,parentLeft+16,'Stem moved away from parent avatar axis');
     near(rect.bottom,next.top,'Shared stem has a gap after row '+index);
     near(rect.top,index===0?rows[0].querySelector('.avatar').getBoundingClientRect().bottom:rows[index].getBoundingClientRect().top,'Stem starts at wrong point');
    }
    for(const row of [rows[1],rows[3]]){
     const elbow=row.querySelector('.reply-connector').getBoundingClientRect(),avatar=row.querySelector('.avatar').getBoundingClientRect();
     near(elbow.left,parentLeft+16,'Elbow detached from parent stem');
     near(elbow.top,row.getBoundingClientRect().top,'Elbow detached vertically');
     near(elbow.right,avatar.left,'Elbow does not reach child avatar');
     near(elbow.bottom,avatar.top+avatar.height/2,'Elbow misses child avatar center');
    }
    assert(!rows[3].querySelector('.reply-stem')&&!rows[4].querySelector('.reply-stem'),'Stem dangles below final reply identity');
    assert(document.querySelector('.composer textarea')===window.__composer,'Reply updates replaced the composer');
    assert(document.documentElement.scrollWidth<=innerWidth,'Reply rows cause horizontal overflow');
    return rows.map(row=>({id:row.id,height:row.getBoundingClientRect().height,stem:row.querySelector('.reply-stem')?.getBoundingClientRect().height??0}));
   };
  });
  await settle();
  console.log('REPLY_CLUSTER_SHORT_PASS',JSON.stringify(await run(()=>window.__assertReplyGeometry())));
  await run(async()=>{
   const snapshot=await window.toby.snapshot();
   const update=(id,change)=>window.fixture.message({...snapshot.messages.find(message=>message.id===id),...change});
   update('design-human',{text:'cluster source: hey guys\n\n'+('A parent can wrap across several lines before its children arrive. '.repeat(10))});
   update('design-jules',{text:'## cluster sibling\n\n'+('A long Markdown reply must keep every sibling connected through its actual height. '.repeat(25))+'\n\n- First check\n- Second check\n\n```ts\nconst unchanged = true;\n```'});
   update('jules-more',{text:'A grouped continuation with a document and wrapped reactions.',attachments:[{id:'reply-file',name:'A detailed release verification report with a deliberately long filename.md',path:'/fixture/report.md',bytes:42,agentId:window.__replyFixture.jules.id}],reactions:['👍','🎉','❤️','👀','✅']});
   window.fixture.refresh();
   // Stress wrapped feedback at a constrained width without changing production CSS.
   document.querySelector('#message-jules-more .message-reactions').style.maxWidth='120px';
  });
  for(const [width,height] of [[1280,800],[960,640]]){
   window.setSize(width,height);await settle();
   console.log('REPLY_CLUSTER_LONG_PASS',width,JSON.stringify(await run(()=>window.__assertReplyGeometry())));
  }
  await run(()=>{
   const chips=[...document.querySelectorAll('#message-jules-more .reaction-chip')];
   if(new Set(chips.map(chip=>chip.getBoundingClientRect().top)).size<2)throw Error('Reaction fixture did not exercise wrapped content');
  });
  // Hover/focus controls are overlays and must not resize the stem or message.
  const hover=await run(()=>{
   const row=document.getElementById('message-jules-more');row.scrollIntoView({block:'center'});
   const rect=row.getBoundingClientRect();return {x:Math.round(rect.right-20),y:Math.round(rect.top+15),height:rect.height};
  });
  window.webContents.sendInputEvent({type:'mouseMove',x:hover.x,y:hover.y});await settle();
  const hoveredHeight=await run(()=>{window.__assertReplyGeometry();const row=document.getElementById('message-jules-more');if(!row.matches(':hover'))throw Error('Hover fixture did not reach its connected row');return row.getBoundingClientRect().height;});
  if(hoveredHeight!==hover.height)throw Error('Hover actions changed connected row height');
  await run(async()=>{
   const assert=(value,message)=>{if(!value)throw Error(message)};
   document.querySelector('[aria-label="Search conversation"]').click();
   await new Promise(resolve=>setTimeout(resolve,30));
   const search=document.querySelector('input[aria-label="Search conversation"]');
   const query=async value=>{search.value=value;search.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,50));};
   await query('cluster');
   const row=id=>document.getElementById('message-'+id);
   assert(!row('jules-more')&&row('design-jules').classList.contains('message-local-reply'),'Filter fixture did not remove only the grouped middle member');
   assert(!row('design-jules').querySelector('.reply-stem')&&row('design-toby').querySelector('.message-reference'),'Filtered member left a stem crossing its missing position');
   await query('sibling');
   assert(!document.querySelector('.reply-stem,.reply-connector'),'Hidden source retained local connectors');
   const reference=row('design-toby').querySelector('.message-reference');assert(reference&&!reference.disabled,'Nonlocal source lost its clickable reference');
   reference.click();
   for(let i=0;i<60&&document.activeElement!==row('design-human');i++)await new Promise(resolve=>setTimeout(resolve,30));
   assert(search.value===''&&document.activeElement===row('design-human'),'Reference did not reveal and focus its actual parent');
   window.__assertReplyGeometry();
   document.querySelector('[aria-label="Close search"]').click();
   const {group,toby,jules,start}=window.__replyFixture;
   window.fixture.message({id:'unrelated',chatId:group.id,senderId:toby.id,role:'assistant',text:'@Jules a separate message.',createdAt:start+180_002,status:'done',audience:'public'});
   window.fixture.message({id:'older',chatId:group.id,senderId:jules.id,role:'assistant',text:'An older reply.',replyTo:'design-human',createdAt:start+180_003,status:'done',audience:'public'});
   window.fixture.message({id:'nested',chatId:group.id,senderId:jules.id,role:'assistant',text:'Reply to an indented message.',replyTo:'design-toby',createdAt:start+180_004,status:'done',audience:'public'});
   window.fixture.refresh();await new Promise(resolve=>setTimeout(resolve,50));
   for(const id of ['unrelated','older','nested'])assert(!row(id).classList.contains('message-local-reply')&&!row(id).querySelector('.reply-stem,.reply-connector'),'Unrelated or nested row invented a local relationship');
   assert(!row('unrelated').querySelector('.message-reference')&&row('older').querySelector('.message-reference')&&row('nested').querySelector('.message-reference'),'Mention and explicit older references were conflated');
   assert(document.querySelector('.composer textarea')===window.__composer,'Reference navigation replaced the composer');
   const add=(id,senderId,text,offset,replyTo)=>window.fixture.message({id,chatId:group.id,senderId,role:senderId==='user'?'user':'assistant',text,createdAt:start+200_000+offset,status:'done',audience:'public',replyTo});
   add('root-first','user','The start of one author block.',0);
   add('root-more','user','A longer grouped root continuation. '.repeat(20),1);
   add('root-parent','user','The actual source of both replies.',2);
   add('root-child-a',jules.id,'The first sibling.',3,'root-parent');
   add('root-child-b',toby.id,'The second sibling.',4,'root-parent');
   window.fixture.refresh();await new Promise(resolve=>setTimeout(resolve,50));
   const roots=['root-first','root-more','root-parent','root-child-a','root-child-b'].map(row);
   const near=(a,b,message)=>assert(Math.abs(a-b)<1,message);
   const sourceAvatar=roots[0].querySelector('.avatar').getBoundingClientRect();
   for(let index=0;index<4;index++){
    const stem=roots[index].querySelector('.reply-stem').getBoundingClientRect();
    near(stem.left,sourceAvatar.left+sourceAvatar.width/2,'Grouped source stem changed its author axis');
    near(stem.top,index===0?sourceAvatar.bottom:roots[index].getBoundingClientRect().top,'Grouped source stem starts in blank gutter');
    near(stem.bottom,roots[index+1].getBoundingClientRect().top,'Grouped source stem contains a gap');
   }
   for(const source of roots.slice(1,3))assert(source.classList.contains('message-grouped')&&!source.querySelector('.message-heading,.avatar'),'Grouped root source repeated its author');
   for(const child of roots.slice(3))assert(child.dataset.replyTarget==='root-parent'&&child.classList.contains('message-local-reply'),'Visual source identity replaced the actual parent ID');
   assert(!roots[4].querySelector('.reply-stem'),'Grouped source cluster has a dangling terminal stem');
  });
  console.log('REPLY_CLUSTERS_PASS: sibling hierarchy, dynamic connected geometry, grouped identities, final endpoint, two widths, Markdown, attachments, wrapped reactions, hover, search boundaries and clickable references');
  clearTimeout(timeout);window.destroy();app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);window.destroy();app.exit(1);}
});
