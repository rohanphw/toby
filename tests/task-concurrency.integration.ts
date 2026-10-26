import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness } from '../src/main/harness';
import type { Agent, Group, Message, Task } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();
 const root=await mkdtemp(join(tmpdir(),'toby-task-concurrency-')),store=new Store(root);
 let harness:Harness,a:Agent,b:Agent,group:Group,running=0,peak=0;
 const tasks=()=>store.all<Task>('tasks');
 const gates=new Map<string,()=>void>(),calls=new Map<string,number>(),prompts=new Map<string,string>();
 const waitFor=async(predicate:()=>boolean,label:string)=>{
  for(let i=0;i<500;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}
  throw Error(`Timed out: ${label}`);
 };
 const held=(name:string,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{
  const abort=()=>{gates.delete(name);reject(Error('Stopped fixture'));};
  gates.set(name,()=>{signal.removeEventListener('abort',abort);gates.delete(name);resolve();});
  signal.addEventListener('abort',abort,{once:true});
 });
 const release=(name:string)=>{assert(gates.has(name),`Missing gate ${name}`);gates.get(name)!();};
 const taskFor=(prompt:string)=>tasks().find(task=>task.prompt===prompt)!;
 const done=(prompt:string)=>waitFor(()=>taskFor(prompt)?.status==='done',`${prompt} completes`);
 const idle=()=>waitFor(()=>!tasks().some(task=>['queued','running','waiting'].includes(task.status))&&store.all<Agent>('agents').every(agent=>agent.status==='idle'),'all jobs settle');
 const browserCalls:string[]=[];
 const providers:any={states:[{provider:'openai',connected:true,models:[{id:'fixture'}]}],turn:async(options:any)=>{
  const assignment=options.prompt.split('\n\nCurrent assignment:\n').at(-1);
  const task=tasks().find(task=>task.agentId===options.agent.id&&task.prompt===assignment&&task.status==='running')!;
  assert(task,'Each provider turn must belong to its own running task');
  calls.set(assignment,(calls.get(assignment)??0)+1);prompts.set(assignment,options.prompt);
  running++;peak=Math.max(peak,running);
  try{
   if(assignment.startsWith('JOB_')){
    const history=options.prompt.split('\n\nCurrent assignment:\n')[0];
    for(const sibling of ['JOB_A_CANARY','JOB_B_CANARY','JOB_C_CANARY'])assert(!history.includes(sibling),'Concurrent requests must not become each other’s history');
    options.onText(`Working on ${assignment}`);await held(assignment,options.signal);return `Finished ${assignment}`;
   }
   if(assignment.startsWith('ASK_')){const allowed=await options.approve('Fixture decision',assignment,undefined,true,'terminal');return `${assignment}: ${allowed?'allowed':'denied'}`;}
   if(assignment.startsWith('FULL_')||assignment==='OTHER_RUNNING'){await held(assignment,options.signal);return assignment+' complete';}
   if(assignment==='PARENT_JOB'){
    if(options.prompt.includes('Private completed subtask results')){
     assert(options.prompt.includes('PRIVATE_CHILD_EVIDENCE'));assert(!options.prompt.includes('OTHER_RUNNING'));
     return 'Combined evidence.';
    }
    await options.callTool('toby_send_message',{agentId:b.id,message:'CHILD_JOB'});return 'PRIVATE_PARENT_HANDOFF';
   }
   if(assignment==='CHILD_JOB'){await held(assignment,options.signal);return 'PRIVATE_CHILD_EVIDENCE';}
   if(assignment==='MAC_OWNER'){await assert.rejects(()=>options.callTool('toby_computer',{action:'describe'}),/declined/);return 'Mac action denied.';}
   if(assignment==='MAC_CONTENDER'){await assert.rejects(()=>options.callTool('toby_computer',{action:'describe'}),/Another task/);return 'Mac remains exclusive.';}
   if(assignment==='BROWSER_OWNER'){await options.callTool('toby_browser_read',{});await held(assignment,options.signal);return 'Browser read complete.';}
   if(assignment==='BROWSER_CONTENDER'){await assert.rejects(()=>options.callTool('toby_browser_open',{url:'https://fixture.invalid'}),/Another task/);return 'Browser remains exclusive.';}
   throw Error('Unexpected fixture assignment');
  }finally{running--;}
 }};
 try{
  harness=new Harness(store,providers,{register:()=>({server:{},dispose(){}})} as any,{close(){},async read(){browserCalls.push('read');return {url:'https://fixture.invalid',elements:[]};},async open(){browserCalls.push('open');}} as any,'/unused',()=>{});
  a=harness.saveAgent({name:'Toby',personality:'',specialization:'',provider:'openai',model:'fixture'});
  b=harness.saveAgent({name:'Worker',personality:'',specialization:'',provider:'openai',model:'fixture'});
  group=harness.saveGroup({name:'Team',instructions:'',members:[a.id,b.id]});
  store.setPreferences({maxConcurrency:2});
  await harness.send(a.id,'JOB_A_CANARY');await waitFor(()=>gates.has('JOB_A_CANARY'),'first job starts');
  await harness.send(a.id,'JOB_B_CANARY');await waitFor(()=>gates.has('JOB_B_CANARY'),'second same-agent job starts concurrently');
  await harness.send(a.id,'JOB_C_CANARY');assert.equal(taskFor('JOB_C_CANARY').status,'queued');assert.equal(peak,2);
  assert.throws(()=>harness.saveAgent({...a,name:'Changed while running'}),/Stop this agent/);
  assert.throws(()=>harness.deleteAgent(a.id),/Stop this agent/);
  release('JOB_B_CANARY');await done('JOB_B_CANARY');await waitFor(()=>gates.has('JOB_C_CANARY'),'queued job uses freed slot');
  assert.equal(store.get<Agent>('agents',a.id)?.status,'working');
  release('JOB_A_CANARY');await done('JOB_A_CANARY');assert.equal(store.get<Agent>('agents',a.id)?.status,'working');
  release('JOB_C_CANARY');await idle();assert.equal(peak,2);
  for(const label of ['JOB_A_CANARY','JOB_B_CANARY','JOB_C_CANARY']){
   const replies=store.all<Message>('messages').filter(message=>message.role==='assistant'&&message.correlationId===taskFor(label).id&&message.status==='done');
   assert.equal(replies.length,1);assert.equal(replies[0].text,`Finished ${label}`);
  }
  await harness.send(a.id,'ASK_DIRECT');store.task({agentId:a.id,chatId:group.id,prompt:'ASK_GROUP',source:'user'});await harness.drain();
  await waitFor(()=>harness.pendingApprovals.length===2,'parallel approvals');
  assert.deepEqual(new Set(harness.pendingApprovals.map(approval=>approval.chatId)),new Set([a.id,group.id]));
  assert.equal(store.get<Agent>('agents',a.id)?.status,'waiting');
  await harness.stop(a.id);await waitFor(()=>harness.pendingApprovals.length===1,'stopping direct chat keeps group approval');
  assert.equal(harness.pendingApprovals[0].chatId,group.id);assert.equal(taskFor('ASK_GROUP').status,'running');
  harness.resolveApproval(harness.pendingApprovals[0].id,false);await idle();
  store.setPreferences({maxConcurrency:3});
  await harness.send(a.id,'PARENT_JOB');await waitFor(()=>gates.has('CHILD_JOB')&&taskFor('PARENT_JOB').status==='waiting','private child starts');
  await harness.send(a.id,'OTHER_RUNNING');await waitFor(()=>gates.has('OTHER_RUNNING'),'same agent works while waiting on its child');
  release('CHILD_JOB');await done('PARENT_JOB');assert.equal(calls.get('PARENT_JOB'),2,'Parent synthesizes once');
  assert.equal(store.get<Agent>('agents',a.id)?.status,'working');release('OTHER_RUNNING');await idle();
  await harness.send(a.id,'MAC_OWNER');await waitFor(()=>harness.pendingApprovals.length===1,'Mac owner approval');
  await harness.send(a.id,'MAC_CONTENDER');await done('MAC_CONTENDER');assert.equal(harness.pendingApprovals.length,1,'A competing task must not also claim Mac control');
  harness.resolveApproval(harness.pendingApprovals[0].id,false);await idle();
  await harness.send(a.id,'BROWSER_OWNER');await waitFor(()=>gates.has('BROWSER_OWNER'),'browser read owns the session');
  await harness.send(a.id,'BROWSER_CONTENDER');await done('BROWSER_CONTENDER');assert.deepEqual(browserCalls,['read']);release('BROWSER_OWNER');await idle();
  store.setPreferences({permissionMode:'full'});
  await harness.send(a.id,'FULL_ONE');await harness.send(a.id,'FULL_TWO');await waitFor(()=>gates.has('FULL_ONE')&&gates.has('FULL_TWO'),'parallel full-access jobs');
  store.setPreferences({permissionMode:'ask'});harness.refreshPermissions();await idle();
  assert.equal(taskFor('FULL_ONE').status,'interrupted');assert.equal(taskFor('FULL_TWO').status,'interrupted');
  assert.deepEqual(tasks().filter(task=>task.status==='failed').map(task=>task.result),[]);
  console.log('TASK_CONCURRENCY_PASS: same-agent parallel jobs, global queue limit, isolated context/results, aggregate status, task-owned approvals and stop, single parent synthesis, browser/Mac exclusion, all-task permission revocation');
 }finally{if(harness!)await harness.shutdown();store.close();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
