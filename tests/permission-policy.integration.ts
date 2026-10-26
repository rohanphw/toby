import { app } from 'electron';
import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/main/store';
import { Providers } from '../src/main/providers';
import { Harness } from '../src/main/harness';
import { PERMISSION_CATEGORIES } from '../src/shared/permissions';
import type { PermissionCategory } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();const root=await mkdtemp(join(tmpdir(),'toby-permission-policy-')),store=new Store(root),providers=new Providers(root,()=>{});
 const harness=new Harness(store,providers,{} as any,{close(){}} as any,'/unused',()=>{});
 const agent=store.saveAgent({name:'Toby',personality:'',specialization:'',provider:'openai',model:'fixture'});
 const ask=(category?:PermissionCategory,canApprove=true,signal=new AbortController().signal)=>(harness as any).approve(agent.id,'Test action','Exact test scope',signal,undefined,canApprove,category) as Promise<boolean>;
 try{
  // Each category is a persistent user decision, not a title or provider metadata hint.
  for(const category of PERMISSION_CATEGORIES){
   store.setPreferences({permissionMode:'ask',allowedActions:[]});const first=ask(category),parallel=ask(category),unrelated=ask(category==='terminal'?'browser':'terminal');
   assert.equal(harness.pendingApprovals.length,3);harness.resolveApproval(harness.pendingApprovals[0].id,true,true);
   assert.equal(await first,true);assert.equal(await parallel,true);assert.deepEqual(store.preferences.allowedActions,[category]);assert.equal(harness.pendingApprovals.length,1);
   harness.resolveApproval(harness.pendingApprovals[0].id,false);assert.equal(await unrelated,false);assert.equal(await ask(category),true);
   store.setPreferences({allowedActions:[]});const revoked=ask(category);assert.equal(harness.pendingApprovals.length,1);harness.resolveApproval(harness.pendingApprovals[0].id,false,true);assert.equal(await revoked,false);assert.deepEqual(store.preferences.allowedActions,[]);
  }
  const pending=ask('terminal');store.setPreferences({permissionMode:'full'});harness.refreshPermissions();assert.equal(await pending,true);
  for(const category of PERMISSION_CATEGORIES)assert.equal(await ask(category),true);
  assert.equal(await ask(undefined,true),true,'Fully identified mixed access is covered by full access');
  const opaque=ask(undefined,false);assert.equal(harness.pendingApprovals.length,1);harness.resolveApproval(harness.pendingApprovals[0].id,true,true);assert.equal(await opaque,false);assert.deepEqual(store.preferences.allowedActions,[]);
  const aborted=new AbortController();aborted.abort();assert.equal(await ask('terminal',true,aborted.signal),false);
  store.setPreferences({permissionMode:'ask'});const controller=new AbortController(),cancelled=ask('terminal',true,controller.signal),approval=harness.pendingApprovals[0];controller.abort();harness.resolveApproval(approval.id,true,true);assert.equal(await cancelled,false);assert.deepEqual(store.preferences.allowedActions,[]);
  const fullController=new AbortController();(harness as any).running.set('full',{controller:fullController,task:{id:'full',agentId:agent.id},permissionMode:'full',childIds:new Set()});harness.refreshPermissions();assert.equal(fullController.signal.aborted,true);(harness as any).running.clear();
  Object.assign(providers.states[0],{installed:true,connected:true,models:[{id:'fixture',name:'Fixture'}]});
  harness.saveAgent({...agent,permissionMode:'full'});assert.equal(await ask('terminal'),true);assert.equal(harness.permissionMode(agent.id),'full');
  store.setPreferences({permissionMode:'full'});harness.saveAgent({...agent,permissionMode:'ask'});
  const agentAsk=ask('terminal');assert.equal(harness.pendingApprovals.length,1);harness.resolveApproval(harness.pendingApprovals[0].id,false);assert.equal(await agentAsk,false);
  const next=ask('terminal');harness.saveAgent({...agent,permissionMode:null});assert.equal(await next,true);assert.equal(store.get<any>('agents',agent.id).permissionMode,undefined);
  const child=await (harness as any).executeTool(agent,{id:'parent',chatId:agent.id},new AbortController().signal,'toby_create_agent',{name:'Child'});
  assert.equal(child.permissionMode,undefined);assert.equal(harness.permissionMode(child.id),'full');store.setPreferences({permissionMode:'ask'});harness.refreshPermissions();assert.equal(harness.permissionMode(child.id),'ask');
  store.setPreferences({permissionMode:'full',autoCreateAgents:true});const askCreator=harness.saveAgent({...agent,permissionMode:'ask'});
  const restrictedChild=await (harness as any).executeTool(askCreator,{id:'parent',chatId:agent.id},new AbortController().signal,'toby_create_agent',{name:'Restricted child'});
  assert.equal(restrictedChild.permissionMode,'ask');assert.equal(harness.permissionMode(restrictedChild.id),'ask');
  const directory=join(root,'runtimes/openai/bin');await mkdir(directory,{recursive:true});await copyFile('tests/fixtures/openai-permission.cjs',join(directory,'codex'));await chmod(join(directory,'codex'),0o755);
  for(const permissionMode of ['ask','full'] as const){const result=await providers.turn({agent,chatId:agent.id,prompt:'Check settings',instructions:'',signal:new AbortController().signal,onText:()=>{},approve:async()=>false,permissionMode,tools:[],callTool:async()=>{},connectors:[]});assert.deepEqual(JSON.parse(result),permissionMode==='full'?{approvalPolicy:'on-request',sandbox:'danger-full-access'}:{approvalPolicy:'on-request',sandbox:'workspace-write'});}
  console.log('PERMISSION_POLICY_PASS: eight categories, parallel grants, revocation, cancellation, opaque/mixed requests, active full session stop, native OpenAI full/ask policy');
 }finally{await harness.shutdown();await providers.shutdown();store.close();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
