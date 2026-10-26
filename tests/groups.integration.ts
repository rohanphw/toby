import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness, TOOLS } from '../src/main/harness';
import { publicMessage } from '../src/shared/conversation';
import type { Agent, Group, GroupDelivery, Message, Task } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();const root=await mkdtemp(join(tmpdir(),'toby-broadcast-')),store=new Store(root);let harness:Harness,group:Group,a:Agent,b:Agent,c:Agent;
 const tasks=()=>store.all<Task>('tasks'),messages=()=>store.all<Message>('messages');const publicMessages=()=>messages().flatMap(message=>publicMessage(message,tasks())?[message]:[]);
 const calls:{agentId:string;provider:string;source:string;ids:string[]}[]=[];let mode='conversation',release:(()=>void)|undefined;let running=0,peak=0;
 const waitFor=async(predicate:()=>boolean)=>{for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Fixture timeout');};
 const idle=async()=>{await waitFor(()=>!tasks().some(task=>['queued','running','waiting'].includes(task.status)));assert.deepEqual(tasks().filter(task=>task.status==='failed').map(task=>task.result),[]);};
 const providers:any={states:[{provider:'openai',connected:true,models:[{id:'fixture'}]},{provider:'grok',connected:true,models:[{id:'fixture'}]}],turn:async(options:any)=>{
  const task=tasks().find(task=>task.agentId===options.agent.id&&task.chatId===options.chatId&&task.prompt===options.prompt.split('\n\nCurrent assignment:\n').at(-1)&&task.status==='running')!;
  if(task.parentId){await assert.rejects(()=>options.callTool('toby_post_group',{groupId:group.id,message:'PRIVATE CHILD'}));await assert.rejects(()=>options.callTool('toby_group_react',{messageId:messages().find(message=>message.role==='user')!.id,emoji:'👍'}));return 'PRIVATE CHILD RESULT';}
  if(!task.channelParticipation)return 'Direct answer';
  running++;peak=Math.max(peak,running);
  calls.push({agentId:options.agent.id,provider:options.agent.provider,source:task.source??'',ids:task.sourceMessageIds??[]});
  try{
   assert(options.instructions.includes('Every active member receives'));
   if(task.source==='peer'){await assert.rejects(()=>options.callTool('toby_create_group',{name:'Peer cannot authorize',members:[a.id]}),/person’s request/);await assert.rejects(()=>options.callTool('toby_add_group_member',{groupId:group.id,agentId:b.id}),/person’s request/);await assert.rejects(()=>options.callTool('toby_schedule',{name:'Peer cannot schedule',prompt:'Repeat',intervalMinutes:1}),/person’s request/);assert(options.instructions.includes('originatingMessage'));}
   const history=await options.callTool('toby_group_history',{});const latest=history.messages.filter((message:any)=>message.role==='user').at(-1);
   assert(!JSON.stringify(history).includes('PRIVATE CHILD'));
   if(mode==='hold'&&task.agentId===a.id)await new Promise<void>((resolve,reject)=>{release=resolve;options.signal.addEventListener('abort',()=>reject(Error('Stopped fixture')),{once:true});});
   if(mode==='greeting'){
    assert(options.instructions.includes('A casual human greeting merits at most a brief greeting or reaction, then stop'));
    assert(options.instructions.includes('Do not turn it into status checks, investigations, assignments'));
    assert(options.instructions.includes('A peer acknowledgement, greeting, reaction, or closing remark needs no reply'));
    assert(task.prompt.includes('do not create status checks or assignments'));
    const facts=JSON.parse(options.instructions.slice(options.instructions.indexOf('{"participationContext"')));
    assert(facts.participationContext.deliveredMessages.length>0);
    if(task.source==='user'&&task.agentId===a.id)await options.callTool('toby_post_group',{groupId:group.id,message:'Hello!'});
    else if(task.source==='user'&&task.agentId===b.id)await options.callTool('toby_group_react',{messageId:latest.id,emoji:'👍'});
    else await options.callTool('toby_group_pass',{});
   }else if(mode==='question'){
    assert(options.instructions.includes('a useful peer question, new evidence, or correction can continue'));
    const facts=JSON.parse(options.instructions.slice(options.instructions.indexOf('{"participationContext"')));
    if(task.agentId===a.id&&task.source==='user')await options.callTool('toby_post_group',{groupId:group.id,message:'@B which fixture covers permissions?'});
    else if(task.agentId===b.id&&task.source==='peer'&&facts.participationContext.deliveredMessages.some((row:any)=>row.text==='@B which fixture covers permissions?'))await options.callTool('toby_post_group',{groupId:group.id,message:'The permission-policy fixture covers permissions.'});
    else if(task.agentId===a.id&&task.source==='peer'&&facts.participationContext.roundReplies.some((row:any)=>row.text==='The permission-policy fixture covers permissions.'))await options.callTool('toby_post_group',{groupId:group.id,message:'Use permission-policy plus group delivery checks.'});
    else await options.callTool('toby_group_pass',{});
   }else if(mode==='duplicate'){
    const result=await options.callTool('toby_post_group',{groupId:group.id,message:'Identical public contribution'});
    assert.equal(result,task.source==='user'?'Posted':'Already posted in this round. Do not repeat it; react or stay quiet unless you have new information.');
   }else if(mode==='conversation'){
    if(task.agentId===a.id&&!history.messages.some((message:any)=>message.text==='A public reply')){await options.callTool('toby_post_group',{groupId:group.id,message:'A public reply'});await options.callTool('toby_post_group',{groupId:group.id,message:'A public reply'});}
    else if(task.agentId===b.id&&!history.messages.some((message:any)=>message.text==='B responds to A')){assert(history.messages.some((message:any)=>message.text==='A public reply'));await options.callTool('toby_post_group',{groupId:group.id,message:'B responds to A',replyTo:history.messages.find((message:any)=>message.text==='A public reply').id});}
    else if(task.agentId===c.id){await options.callTool('toby_group_react',{messageId:latest.id,emoji:'👀'});await options.callTool('toby_group_react',{messageId:latest.id,emoji:'👀'});}
    else await options.callTool('toby_group_pass',{});
   }else if(mode==='loop')await options.callTool('toby_post_group',{groupId:group.id,message:`Loop ${calls.length}`});
   else if(mode==='delegation'&&task.agentId===a.id){if(!options.prompt.includes('Private completed subtask results')){await options.callTool('toby_send_message',{agentId:b.id,message:'Private investigation'});return 'PRIVATE HANDOFF';}assert(options.prompt.includes('PRIVATE CHILD RESULT'));await options.callTool('toby_post_group',{groupId:group.id,message:'Checked the evidence'});}
   else if(mode==='routine'){assert.equal(task.source,'routine');assert(history.messages.some((message:any)=>message.role==='system'&&message.text.includes('Routine:')));await assert.rejects(()=>options.callTool('toby_create_group',{name:'Forbidden',members:[a.id]}),/person’s request/);if(task.agentId===a.id&&!history.messages.some((message:any)=>message.text==='Routine public update'))await options.callTool('toby_post_group',{groupId:group.id,message:'Routine public update'});}
   return 'PRIVATE DECISION AND NATIVE ENDING';
  }finally{running--;}
 }};
 try{
  harness=new Harness(store,providers,{register:()=>({server:{},dispose(){}})} as any,{close(){}} as any,'/unused',()=>{});
  a=harness.saveAgent({name:'A',personality:'',specialization:'',provider:'openai',model:'fixture'});b=harness.saveAgent({...a,id:undefined,name:'B',provider:'grok'});c=harness.saveAgent({...a,id:undefined,name:'C'});group=harness.saveGroup({name:'Team',instructions:'Discuss together',members:[a.id,b.id,c.id],leadAgentId:c.id});store.setPreferences({maxConcurrency:5});
  await harness.send(group.id,'@A question for the group',{recipientAgentId:a.id});await idle();
  const first=messages().find(message=>message.role==='user')!;assert.equal(first.correlationId,undefined);assert.deepEqual(new Set(store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.messageId===first.id).map(receipt=>receipt.agentId)),new Set(group.members));
  assert.equal(publicMessages().filter(message=>message.role==='assistant').length,2);assert.equal(publicMessages().filter(message=>message.role==='tool').length,0);assert(!JSON.stringify(publicMessages()).includes('PRIVATE'));
  assert.equal(store.get<Message>('messages',first.id)?.agentReactions?.length,1);assert(calls.some(call=>call.provider==='grok'));assert.equal(peak,1);
  const aReply=messages().find(message=>message.text==='A public reply')!;assert.equal(aReply.replyTo,first.id);assert(!store.all<GroupDelivery>('group_deliveries').some(receipt=>receipt.messageId===aReply.id&&receipt.agentId===a.id));assert(calls.filter(call=>call.agentId===a.id).length>=2,'A sees B reply');
  for(const name of ['toby_post_group','toby_send_message'])assert(TOOLS.find(tool=>tool.name===name)!.description.includes('greeting'));
  const greetingStart=messages().length,greetingTasks=tasks().length;
  mode='greeting';await harness.send(group.id,'Hello everyone');await idle();
  const greetingMessages=messages().slice(greetingStart),greetingWork=tasks().slice(greetingTasks);
  assert.deepEqual(greetingMessages.filter(message=>message.role==='assistant'&&message.audience==='public').map(message=>message.text),['Hello!']);
  assert.equal(greetingWork.length,5,'Every human delivery plus the greeting peer deliveries settles without another public post');
  assert(greetingWork.every(task=>task.channelParticipation&&!task.parentId));
  assert.equal(greetingMessages.filter(message=>message.role==='user')[0].agentReactions?.length,1);
  assert(greetingWork.every(task=>task.status==='done'));
  mode='question';const questionStart=messages().length;await harness.send(group.id,'Choose release verification checks together');await idle();
  assert.deepEqual(messages().slice(questionStart).filter(message=>message.role==='assistant'&&message.audience==='public').map(message=>message.text),['@B which fixture covers permissions?','The permission-policy fixture covers permissions.','Use permission-policy plus group delivery checks.']);
  mode='duplicate';
  for(let round=0;round<2;round++){const start=messages().length,receipts=store.all<GroupDelivery>('group_deliveries').length;await harness.send(group.id,'Each member report independently');await idle();assert.equal(messages().slice(start).filter(message=>message.role==='assistant'&&message.audience==='public').length,3,'Same text is allowed for different members and new human rounds, but not repeated in one round');assert.equal(store.all<GroupDelivery>('group_deliveries').length-receipts,9,'Suppressed repeats create no new deliveries');}
  mode='loop';const before=messages().length;await harness.send(group.id,'Discuss a bounded round');await idle();const loopPosts=messages().slice(before).filter(message=>message.role==='assistant'&&message.audience==='public');assert.equal(loopPosts.length,6);for(const id of group.members)assert.equal(loopPosts.filter(message=>message.senderId===id).length,2);
  mode='delegation';await harness.send(group.id,'Investigate together');await idle();assert(tasks().some(task=>task.parentId));assert(publicMessages().some(message=>message.text==='Checked the evidence'));assert(!JSON.stringify(publicMessages()).includes('PRIVATE'));
  mode='hold';await harness.send(group.id,'Hold first');await waitFor(()=>!!release);await harness.send(group.id,'Queued second');await harness.send(group.id,'Queued third');assert.equal(tasks().filter(task=>task.channelParticipation&&task.agentId===a.id&&task.status==='queued').length,1);assert.equal(tasks().filter(task=>task.channelParticipation&&task.agentId===b.id&&task.status==='queued').length,1);
  group=harness.saveGroup({...group,members:[a.id,c.id]});assert(!tasks().some(task=>task.agentId===b.id&&['queued','running','waiting'].includes(task.status)));assert(store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.agentId===b.id&&receipt.state!=='done').every(receipt=>receipt.state==='interrupted'));
  store.put('agents',{...store.get<Agent>('agents',a.id)!,hidden:true});harness.hideAgentGroupWork(a.id);mode='quiet';await idle();assert.equal(harness.pendingApprovals.length,0);store.put('agents',{...store.get<Agent>('agents',a.id)!,hidden:false});
  mode='routine';store.put('routines',{id:'routine',name:'Scheduled review',agentId:a.id,chatId:group.id,prompt:'Check status',intervalMinutes:60,nextRun:0,enabled:true});const userCount=messages().filter(message=>message.role==='user').length;await (harness as any).schedule();await idle();assert.equal(messages().filter(message=>message.role==='user').length,userCount);assert(calls.filter(call=>call.source==='routine').length>=2);assert(!JSON.stringify(publicMessages()).includes('PRIVATE'));
  console.log('GROUPS_INTEGRATION_PASS: broadcast, provider selection, peer reply delivery, quiet reactions/pass, coalescing, loop budgets, private child isolation, membership/hiding cancellation, routine origin, fresh serialized turns, greeting instruction contract and quiet completion, necessary peer question, same-round duplicate suppression');
 }finally{if(harness!)await harness.shutdown();store.close();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
