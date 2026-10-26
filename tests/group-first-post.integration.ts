import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness } from '../src/main/harness';
import { publicMessage } from '../src/shared/conversation';
import type { Agent, Group, GroupDelivery, Message, Task } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();
 const root=await mkdtemp(join(tmpdir(),'toby-first-group-post-')),store=new Store(root);
 let harness:Harness,a:Agent,b:Agent,created:Group,existing:Group,privateGroup:Group;
 const tasks=()=>store.all<Task>('tasks'),messages=()=>store.all<Message>('messages');
 const received:string[]=[];
 const providers:any={states:[{provider:'openai',connected:true,models:[{id:'fixture'}]},{provider:'grok',connected:true,models:[{id:'fixture'}]}],turn:async(options:any)=>{
  const task=tasks().find(task=>task.agentId===options.agent.id&&task.chatId===options.chatId&&task.prompt===options.prompt.split('\n\nCurrent assignment:\n').at(-1)&&task.status==='running')!;
  if(task.parentId){await assert.rejects(()=>options.callTool('toby_post_group',{groupId:created.id,message:'PRIVATE WORKER'}),/root participant/);return 'PRIVATE WORKER RESULT';}
  if(task.channelParticipation){
   assert.equal(task.source,'peer','An agent kickoff must not become human authorization');
   for(const id of task.sourceMessageIds??[]){const source=store.get<Message>('messages',id)!;if(source.text!=='The release check should include permission handling.')assert.equal(source.senderId,a.id);received.push(id);}
   if(task.chatId===created.id&&task.agentId===b.id){
    await options.callTool('toby_post_group',{groupId:created.id,message:'The release check should include permission handling.'});
   }else await options.callTool('toby_group_pass',{});
   return 'PRIVATE PARTICIPATION DECISION';
  }
  const post=(group:Group,message:string,extra={})=>options.callTool('toby_post_group',{groupId:group.id,message,...extra});
  if(task.source==='routine'){
   await assert.rejects(()=>post(existing,'Routine cannot start another conversation'),/root participant/);
   return 'Routine checked.';
  }
  if(task.prompt==='Create a group and start both conversations'){
   created=await options.callTool('toby_create_group',{name:'Project desk',members:[b.id],instructions:'Work together'});
   assert.equal(messages().filter(message=>message.chatId===created.id).length,0);
   assert.equal(await post(created,'@Jules which release check should we include?'),'Posted');
   assert.equal(await post(created,'@Jules which release check should we include?'),'Posted');
   await assert.rejects(()=>post(created,'A duplicate turn must not publish twice'),/already/);
   assert.equal(await post(existing,'First message in an existing group.'),'Posted');
   assert.equal(await post(existing,'First message in an existing group.'),'Posted');
   await assert.rejects(()=>post(privateGroup,'Outsider message'),/active member/);
   const user=messages().find(message=>message.chatId===a.id&&message.role==='user')!;
   await assert.rejects(()=>post(privateGroup,'Private quote',{replyTo:user.id}),/active member/);
   return 'I created Project desk and posted the introductions.';
  }
  if(task.prompt==='Check publishing boundaries'){
   if(options.prompt.includes('Private completed subtask results'))return 'Publishing boundaries checked.';
   const user=messages().find(message=>message.chatId===a.id&&message.role==='user')!;
   await assert.rejects(()=>post(existing,'Private quote',{replyTo:user.id}),/not visible/);
   store.put('agents',{...a,hidden:true});
   try{await assert.rejects(()=>post(existing,'Hidden member'),/active member/);}finally{store.put('agents',a);}
   for(const invalid of [{...task,status:'queued'},{...task,agentId:b.id}]){
    store.put('tasks',invalid);
    try{await assert.rejects(()=>post(existing,'Inactive caller'),/root participant/);}finally{store.put('tasks',task);}
   }
   await options.callTool('toby_send_message',{agentId:b.id,message:'Check privately'});
   return 'PRIVATE DELEGATION ACK';
  }
  throw Error('Unexpected fixture assignment');
 }};
 const idle=async()=>{
  for(let i=0;i<500;i++){
   if(tasks().length&&!tasks().some(task=>['queued','running','waiting'].includes(task.status))){
    assert.deepEqual(tasks().filter(task=>task.status==='failed').map(task=>task.result),[]);return;
   }
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw Error('First-post fixture timeout');
 };
 try{
  harness=new Harness(store,providers,{register:()=>({server:{},dispose(){}})} as any,{close(){}} as any,'/unused',()=>{});
  a=harness.saveAgent({name:'Toby',personality:'',specialization:'',provider:'openai',model:'fixture'});
  b=harness.saveAgent({name:'Jules',personality:'',specialization:'',provider:'grok',model:'fixture'});
  existing=harness.saveGroup({name:'Existing empty group',instructions:'',members:[b.id,a.id],leadAgentId:b.id});
  privateGroup=harness.saveGroup({name:'Private group',instructions:'',members:[b.id]});
  await harness.send(a.id,'Create a group and start both conversations');await idle();
  for(const group of [created,existing]){
   const posts=messages().filter(message=>message.chatId===group.id&&message.role==='assistant'&&message.senderId===a.id&&message.audience==='public');
   assert.equal(posts.length,1,'One deliberately published kickoff per destination');
   assert.equal(posts[0].replyTo,undefined,'No private direct-chat reply link enters the group');
   assert(publicMessage(posts[0],tasks()));assert(received.includes(posts[0].id));
   const receipts=store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.messageId===posts[0].id);
   assert.deepEqual(receipts.map(receipt=>receipt.agentId),[b.id]);assert.equal(receipts[0].state,'done');
  }
  assert(messages().some(message=>message.chatId===a.id&&message.text==='I created Project desk and posted the introductions.'&&publicMessage(message,tasks())),'Direct-chat completion must remain visible after a group kickoff');
  assert(messages().some(message=>message.chatId===created.id&&message.text==='The release check should include permission handling.'&&publicMessage(message,tasks())),'A peer must be able to respond to the kickoff');
  assert.equal(messages().filter(message=>message.chatId===privateGroup.id&&message.role==='assistant').length,0);
  store.task({agentId:a.id,chatId:a.id,prompt:'Routine probe',source:'routine'});await (harness as any).drain();await idle();
  await harness.send(a.id,'Check publishing boundaries');await idle();
  assert(!messages().some(message=>message.audience==='public'&&message.text.startsWith('PRIVATE')));
  console.log('GROUP_FIRST_POST_PASS: new/existing/non-lead groups, per-group retry deduplication, peer delivery and response, direct-chat completion, private-worker/routine/outsider/hidden/inactive/quote boundaries');
 }finally{if(harness!)await harness.shutdown();store.close();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
