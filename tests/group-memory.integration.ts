import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness } from '../src/main/harness';
import { publicMessage } from '../src/shared/conversation';
import type { Agent, Group, GroupMemory, Message, Task } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();const root=await mkdtemp(join(tmpdir(),'toby-group-memory-'));let store=new Store(root),harness:Harness;let lead:Agent,worker:Agent,outsider:Agent,group:Group,other:Group;let memoryId='';const checks=new Set<()=>void>(),violations:string[]=[],emitted:Message[]=[];
 const changed=()=>{const tasks=store.all<Task>('tasks');for(const message of store.all<Message>('messages')){const visible=publicMessage(message,tasks);if(visible?.text.includes('PRIVATE_'))violations.push(message.id);}for(const check of checks)check();};
 const providers:any={states:[{provider:'openai',connected:true,models:[{id:'fixture'}]}],turn:async(options:any)=>{
  const task=store.all<Task>('tasks').find(task=>task.agentId===options.agent.id&&task.chatId===options.chatId&&task.prompt===options.prompt.split('\n\nCurrent assignment:\n').at(-1)&&task.status==='running')!;
  const delivered=(task.sourceMessageIds??[]).map(id=>store.get<Message>('messages',id)!);
  const prompt=task.channelParticipation?delivered.find(message=>message.role==='user')?.text:options.prompt.split('\n\nCurrent assignment:\n').at(-1);
  const post=async(text:string)=>{await options.callTool('toby_post_group',{groupId:task.chatId,message:text});return 'PRIVATE_NATIVE_DECISION';};
  if(task.channelParticipation&&(!prompt||options.agent.id===worker.id)){
   for(const message of delivered)assert(options.instructions.includes(message.id));
   if(prompt==='After restart'){assert(options.instructions.includes(memoryId));assert(options.instructions.includes('Approved release codename is Zephyr'));}
   await options.callTool('toby_group_pass',{});return 'PRIVATE_SILENT_DECISION';
  }
  if(prompt==='Inspect and remember'){
   assert(options.instructions.includes('Ship the mobile launch'));assert(options.instructions.includes(group.id));
   const groups=await options.callTool('toby_list_groups',{});assert.deepEqual(groups.groups.map((g:any)=>g.id),[group.id]);
   const members=await options.callTool('toby_group_members',{limit:1});assert.equal(members.members[0].id,lead.id);assert.equal((await options.callTool('toby_group_members',{after:members.nextAfter})).members[0].id,worker.id);
   const history=await options.callTool('toby_group_history',{});const source=history.messages.find((m:any)=>m.text==='Inspect and remember');assert(source?.id);assert(options.instructions.includes(source.id));
   const memory=await options.callTool('toby_remember_group',{text:'Approved release codename is Zephyr',sourceMessageIds:[source.id]});memoryId=memory.id;assert.equal(memory.authorId,lead.id);
   assert.equal((await options.callTool('toby_group_search',{query:'Zephyr'}))[0].id,memory.id);
   await assert.rejects(()=>options.callTool('toby_group_history',{groupId:other.id}),/not a member/);await assert.rejects(()=>options.callTool('toby_group_search',{groupId:other.id,query:'secret'}),/not a member/);
   return post('Shared launch facts saved.');
  }
  if(prompt==='After restart'){
   assert(options.instructions.includes('Approved release codename is Zephyr'));assert(options.instructions.includes(memoryId));
   const history=await options.callTool('toby_group_history',{});assert(history.messages.some((m:any)=>m.text==='Shared launch facts saved.'));
   const found=await options.callTool('toby_group_search',{query:'Zephyr'});assert.equal(found[0].id,memoryId);assert.equal(found[0].sourceMessageIds.length,1);return post('Shared context restored.');
  }
  if(prompt==='Delegate private facts'){
   if(options.prompt.includes('Private completed subtask results')){assert(options.prompt.includes('PRIVATE_WORKER_FACT'));assert(!JSON.stringify(store.all<GroupMemory>('group_memories')).includes('PRIVATE_'));return post('Worker evidence reviewed.');}
   await options.callTool('toby_send_message',{agentId:worker.id,message:'PRIVATE_WORKER_BRIEF'});return 'PRIVATE_OWNER_HANDOFF';
  }
  if(prompt==='PRIVATE_WORKER_BRIEF'){
   const history=await options.callTool('toby_group_history',{});const source=history.messages.find((m:any)=>m.text==='Delegate private facts');assert(source?.id);
   for(const sourceMessageIds of [undefined,[source.id]])await assert.rejects(()=>options.callTool('toby_remember_group',{text:'PRIVATE_WORKER_FACT',sourceMessageIds}),/Only the owner/);
   return 'PRIVATE_WORKER_FACT';
  }
  if(prompt==='Inactive owner probe'){
   for(const invalid of [{...task,status:'queued' as const},{...task,agentId:worker.id}]){
    store.put('tasks',invalid);
    try{await assert.rejects(()=>options.callTool('toby_remember_group',{text:'PRIVATE_INVALID_OWNER'}),/Only the owner/);}finally{store.put('tasks',task);}
   }
   return post('Only the active participant can save shared facts.');
  }
  if(prompt==='Outsider probe'){await assert.rejects(()=>options.callTool('toby_group_history',{groupId:group.id}),/not a member/);await assert.rejects(()=>options.callTool('toby_group_members',{groupId:group.id}),/not a member/);return post('Private group remained inaccessible.');}
  if(prompt==='Private chat probe'){await assert.rejects(()=>options.callTool('toby_remember_group',{text:'Do not copy this private fact'}),/Group no longer exists/);return 'Private facts stayed private.';}
  throw Error('Unexpected fixture assignment');
 }};
 const create=()=>new Harness(store,providers,{register:()=>({server:{},dispose(){}})} as any,{close(){}} as any,'/unused',changed,message=>emitted.push(message));
 const send=async(chatId:string,prompt:string)=>{
  const previous=new Set(store.all<Task>('tasks').map(task=>task.id));await harness.send(chatId,prompt);await new Promise<void>((resolve,reject)=>{let timer:ReturnType<typeof setTimeout>;const check=()=>{const tasks=store.all<Task>('tasks').filter(task=>!previous.has(task.id));if(tasks.length&&tasks.every(task=>['done','failed','interrupted'].includes(task.status))){clearTimeout(timer);checks.delete(check);try{for(const task of tasks)assert.equal(task.status,'done',task.result);resolve();}catch(error){reject(error);}}};checks.add(check);timer=setTimeout(()=>{checks.delete(check);reject(Error('Group memory fixture timeout'));},5000);check();});
 };
 try{
  harness=create();lead=harness.saveAgent({name:'Lead',personality:'',specialization:'Coordination',provider:'openai',model:'fixture'});worker=harness.saveAgent({...lead,id:undefined,name:'Worker'});outsider=harness.saveAgent({...lead,id:undefined,name:'Outsider'});
  group=harness.saveGroup({name:'Launch',instructions:'Ship the mobile launch',members:[lead.id,worker.id],leadAgentId:lead.id});other=harness.saveGroup({name:'Separate group',instructions:'Unrelated',members:[outsider.id]});
  await send(group.id,'Inspect and remember');await send(group.id,'Delegate private facts');await send(group.id,'Inactive owner probe');await send(other.id,'Outsider probe');await send(lead.id,'Private chat probe');assert.equal(store.all<GroupMemory>('group_memories').length,1);
  await harness.shutdown();store.close();store=new Store(root);harness=create();await send(group.id,'After restart');assert.equal(store.get<GroupMemory>('group_memories',memoryId)?.authorId,lead.id);
  assert.deepEqual(violations,[]);assert(!JSON.stringify(emitted).includes('PRIVATE_'));const visible=store.all<Message>('messages').filter(message=>publicMessage(message,store.all<Task>('tasks')));assert(visible.some(message=>message.text==='Shared context restored.'));assert(!visible.some(message=>message.role==='tool'&&message.chatId===group.id));
  console.log('GROUP_MEMORY_INTEGRATION_PASS: runtime identity, scoped discovery/members/history/search, durable shared facts and source IDs, worker/inactive-owner/outsider/private-chat denial, complete context after restart');
 }finally{if(harness!)await harness.shutdown();store.close();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
