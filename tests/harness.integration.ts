import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness } from '../src/main/harness';
import { publicMessage } from '../src/shared/conversation';
import type { Agent, Task, Message } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();
 const root=await mkdtemp(join(tmpdir(),'toby-harness-test-'));
 const store=new Store(root);
 const waiters=new Set<()=>void>();
 const changed=()=>{for(const check of [...waiters])check();};
 const waitFor=(predicate:()=>boolean,label:string)=>new Promise<void>((resolve,reject)=>{
  const check=()=>{if(!predicate())return;clearTimeout(timer);waiters.delete(check);resolve();};
  const timer=setTimeout(()=>{waiters.delete(check);reject(Error(`Timed out: ${label}\n${JSON.stringify(store.all<Task>('tasks').map(t=>({prompt:t.prompt,status:t.status,result:t.result})))}`));},5000);
  waiters.add(check);check();
 });
 const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};};
 const first=deferred(),second=deferred(),stream=deferred(),streamStarted=deferred(),resetStarted=deferred();
 const emitted:Message[]=[];
 const calls:{assignment:string;agent:string;synthesis:boolean;prompt:string}[]=[];
 const deliveries:{agentId:string;sourceMessageIds:string[]}[]=[];
 let lead:Agent,worker:Agent,other:Agent,groupId='',otherGroupId='';
 const providers:any={
  states:[{provider:'openai',connected:true,models:[{id:'test-openai'}]},{provider:'grok',connected:true,models:[{id:'test-grok'}]}],
  turn:async(o:any)=>{
   const task=store.all<Task>('tasks').find(task=>task.agentId===o.agent.id&&task.chatId===o.chatId&&task.prompt===o.prompt.split('\n\nCurrent assignment:\n').at(-1)&&task.status==='running')!;
   const source=task.sourceMessageIds?.map(id=>store.get<Message>('messages',id)).findLast(message=>message?.role==='user');
   const assignment=task.channelParticipation?source?.text??'Peer discussion':o.prompt.split('\n\nCurrent assignment:\n').at(-1);
   if(task.channelParticipation){deliveries.push({agentId:o.agent.id,sourceMessageIds:task.sourceMessageIds??[]});if(o.agent.id!==lead.id||task.source==='peer'){await o.callTool('toby_group_pass',{});return 'PRIVATE SILENT PARTICIPATION';}}
   const synthesis=o.prompt.includes('Private completed subtask results');
   calls.push({assignment,agent:o.agent.id,synthesis,prompt:o.prompt});
   const answer=async(text:string)=>{o.onText(text);if(task.channelParticipation&&!text.startsWith('PRIVATE')){await o.callTool('toby_post_group',{groupId:task.chatId,message:text});return 'PRIVATE NATIVE ENDING';}return text;};
   const untilAbort=()=>new Promise<never>((_resolve,reject)=>{o.signal.addEventListener('abort',()=>reject(Error('Stopped by fixture')),{once:true});});
   if(assignment.startsWith('Continue this previously interrupted assignment.')){assert(o.agent.id===lead.id);assert(o.chatId===groupId);assert(assignment.includes('Original recovery request'));assert(assignment.includes('PRIVATE SUCCESS EVIDENCE'));assert(assignment.includes('PRIVATE RETRY FAILURE'));assert(!assignment.includes('PRIVATE RETRY WORKER BRIEF'));return answer('Recovered public answer.');}
   if(assignment==='coordinate'){
    if(synthesis){assert(o.prompt.includes('PRIVATE RESULT FIRST'));assert(o.prompt.includes('PRIVATE RESULT SECOND'));return answer('Combined public answer.');}
    const sent=await o.callTool('toby_send_message',{agentId:worker.id,message:'PRIVATE BRIEF FIRST'});
    assert.equal((await o.callTool('toby_send_message',{agentId:worker.id,message:'PRIVATE BRIEF FIRST'})).taskId,sent.taskId);
    await o.callTool('toby_send_message',{agentId:other.id,message:'PRIVATE BRIEF SECOND'});
    return answer('PRIVATE ACKNOWLEDGEMENT');
   }
   if(assignment==='PRIVATE BRIEF FIRST'){
    await assert.rejects(()=>o.callTool('toby_post_group',{groupId,message:'PRIVATE WORKER POST'}),/owner|root participant/);
    await first.promise;return answer('PRIVATE RESULT FIRST');
   }
   if(assignment==='PRIVATE BRIEF SECOND'){await second.promise;return answer('PRIVATE RESULT SECOND');}
   if(assignment==='race'){
    if(synthesis)return answer('Race synthesis.');
    await o.callTool('toby_send_message',{agentId:worker.id,message:'RACE CHILD'});
    await waitFor(()=>store.all<Task>('tasks').some(t=>t.prompt==='RACE CHILD'&&t.status==='done'),'child completes before parent turn');
    return answer('PRIVATE RACE ACK');
   }
   if(assignment==='RACE CHILD')return answer('PRIVATE RACE RESULT');
   if(assignment==='nested'){
    if(synthesis){assert(o.prompt.includes('PRIVATE NESTED SYNTHESIS'));return answer('Nested public answer.');}
    await o.callTool('toby_send_message',{agentId:worker.id,message:'NESTED PARENT'});return answer('PRIVATE NESTED ACK');
   }
   if(assignment==='NESTED PARENT'){
    if(synthesis){assert(o.prompt.includes('PRIVATE LEAF RESULT'));return answer('PRIVATE NESTED SYNTHESIS');}
    await o.callTool('toby_send_message',{agentId:other.id,message:'NESTED LEAF'});return answer('PRIVATE WORKER ACK');
   }
   if(assignment==='NESTED LEAF')return answer('PRIVATE LEAF RESULT');
   if(assignment==='stop waiting'){
    assert(!synthesis,'Stopped parent must never synthesize');
    await o.callTool('toby_send_message',{agentId:worker.id,message:'STOP FIRST'});
    await o.callTool('toby_send_message',{agentId:other.id,message:'STOP SECOND'});
    return answer('PRIVATE STOP ACK');
   }
   if(assignment==='STOP FIRST'||assignment==='STOP SECOND'){await new Promise<void>(resolve=>o.signal.addEventListener('abort',()=>resolve(),{once:true}));return answer('PRIVATE LATE RESULT AFTER STOP');}
   if(assignment==='publish'){
    await assert.rejects(()=>o.callTool('toby_post_group',{groupId:otherGroupId,message:'Wrong group'}),/owner|root participant/);
    await o.callTool('toby_post_group',{groupId,message:'Published once.'});
    await o.callTool('toby_post_group',{groupId,message:'Published once.'});
    await assert.rejects(()=>o.callTool('toby_post_group',{groupId,message:'Second final'}),/already/);
    await assert.rejects(()=>o.callTool('toby_send_message',{agentId:worker.id,message:'Too late'}),/already/);
    return answer('Published once.');
   }
   if(assignment==='bounded'){
    const rootTask=task;
    const count=store.all<Task>('tasks').filter(t=>t.rootId===rootTask.id).length;
    if(count===8){await assert.rejects(()=>o.callTool('toby_send_message',{agentId:worker.id,message:'BOUND 9'}),/limit/);return answer('Bounded public answer.');}
    await o.callTool('toby_send_message',{agentId:worker.id,message:`BOUND ${count+1}`});return answer('PRIVATE BOUND ACK');
   }
   if(assignment.startsWith('BOUND '))return answer('PRIVATE BOUND RESULT');
   if(assignment==='stream fixture'){o.onText('PRIVATE PENDING TEXT');streamStarted.resolve();await stream.promise;return 'Final text only.';}
   if(assignment==='failed fixture'){o.onText('PRIVATE FAILED PARTIAL');throw Error('Fixture failed');}
   if(assignment==='deleted worker'){assert(synthesis);assert(o.prompt.includes('Agent was removed'));return answer('Removed worker reported.');}
   if(assignment==='history fixture'){assert(!(o.prompt+o.instructions).includes('PRIVATE LEGACY'));assert(!(o.prompt+o.instructions).includes('PRIVATE ACKNOWLEDGEMENT'));return answer('History checked.');}
   if(assignment.endsWith('safe reply fixture')){assert(!(o.prompt+o.instructions).includes('PRIVATE_QUOTED_DIAGNOSTIC'));assert((o.prompt+o.instructions).includes('Toby couldn’t complete this action.'));return answer('Quoted safely.');}
   if(assignment==='group approval fixture'){if(synthesis)return answer('Approval reviewed.');await o.callTool('toby_send_message',{agentId:worker.id,message:'APPROVAL CHILD'});return answer('PRIVATE APPROVAL ACK');}
   if(assignment==='APPROVAL CHILD'){await assert.rejects(()=>o.callTool('toby_run_command',{command:'echo SHOULD_NOT_EXECUTE'}),/declined/);return answer('PRIVATE DENIED WORKER');}
   if(assignment==='wait for approval'){await o.callTool('toby_run_command',{command:'echo SHOULD_NOT_EXECUTE'});throw Error('Must not run denied command');}
   if(assignment==='wait for reset'){resetStarted.resolve();return untilAbort();}
   throw Error(`Unexpected assignment: ${assignment}`);
  }
 };
 const mcp:any={register:()=>({server:{},dispose:()=>{}})};
 const browser:any={close(){}};
 const harness=new Harness(store,providers,mcp,browser,'/missing',changed,message=>{emitted.push(message);changed();});
 const tasks=()=>store.all<Task>('tasks');
 const visible=()=>store.all<Message>('messages').flatMap(message=>{const row=publicMessage(message,tasks());return row?[row]:[];});
 const matches=(task:Task,prompt:string)=>task.prompt===prompt||task.channelParticipation&&task.agentId===lead.id&&task.source==='user'&&task.sourceMessageIds?.some(id=>store.get<Message>('messages',id)?.text===prompt);
 const finished=(prompt:string)=>waitFor(()=>tasks().some(t=>matches(t,prompt)&&t.status==='done'),`${prompt} done`);
 try{
  lead=harness.saveAgent({name:'Toby',personality:'',specialization:'Lead',provider:'openai',model:'test-openai'});
  worker=harness.saveAgent({name:'Research',personality:'',specialization:'Research',provider:'grok',model:'test-grok'});
  other=harness.saveAgent({name:'Check',personality:'',specialization:'Check',provider:'openai',model:'test-openai'});
  groupId=harness.saveGroup({name:'Mixed team',instructions:'Coordinate',members:[lead.id,worker.id,other.id]}).id;
  otherGroupId=harness.saveGroup({name:'Other team',instructions:'',members:[lead.id]}).id;
  await harness.send(groupId,'coordinate');
  await waitFor(()=>tasks().some(t=>matches(t,'coordinate')&&t.status==='waiting'),'parent waiting');
  second.resolve();
  await waitFor(()=>tasks().some(t=>t.prompt==='PRIVATE BRIEF SECOND'&&t.status==='done'),'second worker first');
  assert.equal(tasks().find(t=>matches(t,'coordinate'))?.status,'waiting');
  assert.equal(calls.filter(c=>c.assignment==='coordinate').length,1);
  first.resolve();await finished('coordinate');
  await waitFor(()=>!tasks().some(task=>['queued','running','waiting'].includes(task.status)),'all group receipts settled');
  assert.equal(tasks().filter(task=>matches(task,'coordinate')).length,1,'Synthesis must reuse the same member participation task');
  assert.equal(tasks().filter(task=>task.parentId).length,2,'Broadcast subscribers are independent from private child tasks');
  const coordinateMessage=store.all<Message>('messages').find(message=>message.role==='user'&&message.text==='coordinate')!;
  assert.deepEqual(new Set(deliveries.filter(delivery=>delivery.sourceMessageIds.includes(coordinateMessage.id)).map(delivery=>delivery.agentId)),new Set([lead.id,worker.id,other.id]),'Every member independently receives the human message');
  const combinedMessage=visible().find(message=>message.text==='Combined public answer.')!;
  assert.deepEqual(new Set(deliveries.filter(delivery=>delivery.sourceMessageIds.includes(combinedMessage.id)).map(delivery=>delivery.agentId)),new Set([worker.id,other.id]),'A deliberate public answer reaches every peer');
  assert.equal(calls.filter(c=>c.assignment==='coordinate').length,2);
  assert.equal(visible().filter(m=>m.role==='assistant').length,1);
  assert.equal(visible().find(m=>m.role==='assistant')?.text,'Combined public answer.');
  assert(emitted.every(m=>m.audience==='public'&&!m.text.includes('PRIVATE')));
  const childIds=new Set(tasks().filter(t=>t.parentId).map(t=>t.id));
  assert(store.all<Message>('messages').filter(m=>m.correlationId&&childIds.has(m.correlationId)).every(m=>m.audience==='internal'));
  assert(tasks().filter(t=>t.parentId).every(t=>t.displayPrompt==='Helping a teammate'));
  const privateMessage=store.all<Message>('messages').find(m=>m.text==='PRIVATE RESULT FIRST')!;
  await assert.rejects(()=>harness.send(groupId,'reply',{replyTo:privateMessage.id}),/visible/);

  await harness.send(groupId,'race');await finished('race');
  assert.equal(calls.filter(c=>c.assignment==='race').length,2,'Early child completion needs exactly one synthesis');
  await harness.send(groupId,'nested');await finished('nested');
  assert.equal(calls.filter(c=>c.assignment==='nested').length,2);
  assert.equal(calls.filter(c=>c.assignment==='NESTED PARENT').length,2);
  assert(visible().some(m=>m.text==='Nested public answer.'));
  assert(visible().every(m=>!m.text.includes('PRIVATE')));

  await harness.send(groupId,'publish');await finished('publish');
  assert.equal(visible().filter(m=>m.text==='Published once.').length,1);
  assert(!visible().some(m=>m.chatId===otherGroupId));
  await harness.send(groupId,'bounded');await finished('bounded');
  const bounded=tasks().find(t=>matches(t,'bounded'))!;
  assert.equal(tasks().filter(t=>t.rootId===bounded.id).length,8);
  assert.equal(calls.filter(c=>c.assignment==='bounded').length,9);

  store.setPreferences({maxConcurrency:1});
  await harness.send(groupId,'stop waiting');
  await waitFor(()=>tasks().some(t=>matches(t,'stop waiting')&&t.status==='waiting')&&tasks().some(t=>t.prompt==='STOP FIRST'&&t.status==='running'),'waiting parent with running child');
  assert.equal(tasks().find(t=>t.prompt==='STOP SECOND')?.status,'queued');
  await harness.stop(groupId);
  await waitFor(()=>store.all<Agent>('agents').every(a=>a.status==='idle'),'stopped agents idle');
  await harness.drain();
  assert(tasks().filter(t=>matches(t,'stop waiting')||t.prompt.startsWith('STOP ')).every(t=>t.status==='interrupted'));
  assert.equal(calls.filter(c=>c.assignment==='stop waiting').length,1);
  assert.equal(calls.filter(c=>c.assignment==='STOP SECOND').length,0);
  store.setPreferences({maxConcurrency:3});

  const before=emitted.length;
  await harness.send(lead.id,'stream fixture');await streamStarted.promise;
  assert([...harness.streamingMessages.values()].some(m=>m.text==='PRIVATE PENDING TEXT'&&m.audience==='internal'));
  assert.equal(emitted.length,before,'Pending text must never leave the harness');
  stream.resolve();await finished('stream fixture');
  assert.equal(emitted.at(-1)?.text,'Final text only.');
  assert.equal(harness.streamingMessages.size,0);
  await harness.send(lead.id,'failed fixture');
  await waitFor(()=>tasks().some(t=>t.prompt==='failed fixture'&&t.status==='failed'),'failed provider');
  assert(visible().every(m=>!m.text.includes('PRIVATE FAILED PARTIAL')));
  assert(emitted.every(m=>!m.text.includes('PRIVATE')));

  const legacy=store.task({agentId:worker.id,chatId:groupId,prompt:'PRIVATE LEGACY BRIEF',parentId:tasks()[0].id});
  store.put('tasks',{...legacy,status:'done',result:'PRIVATE LEGACY RESULT'});
  store.addMessage({chatId:groupId,senderId:worker.id,role:'assistant',text:'PRIVATE LEGACY RESULT',status:'done',correlationId:legacy.id});
  await harness.send(groupId,'history fixture');await finished('history fixture');
  const failedLegacyReply=store.addMessage({chatId:groupId,senderId:lead.id,role:'assistant',text:'mcp__calendar__delete_event {\"rawInput\":\"PRIVATE_QUOTED_DIAGNOSTIC\"}',status:'failed'});
  await harness.send(groupId,'safe reply fixture',{replyTo:failedLegacyReply.id});
  await waitFor(()=>tasks().some(task=>matches(task,'safe reply fixture')&&task.status==='done'),'safe quoted context');
  await mkdir(join(root,'outside'));await symlink(join(root,'outside'),join(lead.workspace,'escape'));
  await assert.rejects(()=>harness.path(lead.id,'../outside'),/workspace/);
  await assert.rejects(()=>harness.path(lead.id,'escape/private.txt'),/Symlink/);
  await harness.send(lead.id,'wait for approval');await waitFor(()=>harness.pendingApprovals.length===1,'approval');
  assert.equal(harness.pendingApprovals[0].chatId,lead.id);
  await harness.stop(lead.id);await waitFor(()=>harness.pendingApprovals.length===0&&store.all<Agent>('agents').every(a=>a.status==='idle'),'approval cancelled');
  await harness.send(groupId,'group approval fixture');await waitFor(()=>harness.pendingApprovals.length===1,'delegated approval');assert.equal(harness.pendingApprovals[0].agentId,worker.id);assert.equal(harness.pendingApprovals[0].chatId,groupId);harness.resolveApproval(harness.pendingApprovals[0].id,false);await finished('group approval fixture');
  const removed=harness.saveAgent({name:'Temporary',personality:'',specialization:'',provider:'grok',model:'test-grok'});
  const waitingParent=store.task({agentId:lead.id,chatId:lead.id,prompt:'deleted worker'});
  store.put('tasks',{...waitingParent,status:'waiting'});
  const deletedChild=store.task({agentId:removed.id,chatId:removed.id,prompt:'NEVER START DELETED WORKER',parentId:waitingParent.id,rootId:waitingParent.id});
  harness.deleteAgent(removed.id);await finished('deleted worker');
  assert.equal(store.get<Task>('tasks',deletedChild.id)?.status,'interrupted');
  assert.equal(calls.filter(c=>c.assignment==='deleted worker').length,1);
  const recoveryRoot=store.task({agentId:lead.id,chatId:groupId,prompt:'Original recovery request',displayPrompt:'Recover the original request'});
  store.put('tasks',{...recoveryRoot,status:'done',result:'Partial outcome'});
  const failedChild=store.task({agentId:worker.id,chatId:groupId,prompt:'PRIVATE RETRY WORKER BRIEF',parentId:recoveryRoot.id,rootId:recoveryRoot.id});
  store.put('tasks',{...failedChild,status:'failed',result:'PRIVATE RETRY FAILURE'});
  const successfulChild=store.task({agentId:other.id,chatId:groupId,prompt:'Another recovery subtask',parentId:recoveryRoot.id,rootId:recoveryRoot.id});
  store.put('tasks',{...successfulChild,status:'done',result:'PRIVATE SUCCESS EVIDENCE'});
  store.put('tasks',{...recoveryRoot,status:'waiting'});
  assert.throws(()=>harness.resumeTask(failedChild.id),/owning task is still running/);
  store.put('tasks',{...recoveryRoot,status:'failed'});
  store.put('tasks',{...successfulChild,status:'running'});
  assert.throws(()=>harness.resumeTask(failedChild.id),/Stop the remaining work/);
  store.put('tasks',{...successfulChild,status:'done',result:'PRIVATE SUCCESS EVIDENCE'});
  store.put('tasks',{...recoveryRoot,status:'done'});
  harness.resumeTask(failedChild.id);
  await waitFor(()=>tasks().some(t=>t.prompt.startsWith('Continue this previously interrupted assignment.')&&t.status==='done'),'retry owning root');
  const resumed=tasks().find(t=>t.prompt.startsWith('Continue this previously interrupted assignment.'))!;
  assert.equal(resumed.agentId,lead.id);assert.equal(resumed.chatId,groupId);assert.equal(resumed.parentId,undefined);assert.equal(resumed.displayPrompt,'Recover the original request');
  assert(visible().some(m=>m.text==='Recovered public answer.'));
  const stoppedParent=store.task({agentId:lead.id,chatId:lead.id,prompt:'STOPPED ANCESTOR'});
  store.put('tasks',{...stoppedParent,status:'interrupted'});
  const queuedChild=store.task({agentId:worker.id,chatId:worker.id,prompt:'MUST NOT REPLAY',parentId:stoppedParent.id});
  await harness.drain();assert.equal(store.get<Task>('tasks',queuedChild.id)?.status,'interrupted');
  assert(!calls.some(c=>c.assignment==='MUST NOT REPLAY'));
  await harness.send(lead.id,'wait for reset');await resetStarted.promise;await harness.shutdown();
  assert.equal(harness.streamingMessages.size,0);assert.equal(harness.pendingApprovals.length,0);
  assert(tasks().some(t=>t.prompt==='wait for reset'&&t.status==='interrupted'));
  assert(store.all<Agent>('agents').every(a=>a.status==='idle'));
  console.log('HARNESS_INTEGRATION_PASS: private worker traffic, multi-child and early-result join, same-task synthesis, nested results, bounded delegation, stop/restart guards, removed-worker recovery, root-owned retry, public post controls, final-only publication, history boundary, symlink confinement, approval cancellation, shutdown');
 }finally{await harness.shutdown();store.close();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(e=>{console.error(e);app.exit(1)});
