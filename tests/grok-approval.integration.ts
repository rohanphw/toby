import { app } from 'electron';
import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/main/store';
import { Providers } from '../src/main/providers';
import { McpHost } from '../src/main/mcp-host';
import { Harness } from '../src/main/harness';
import type { Approval, Task } from '../src/shared/contracts';

void app.whenReady().then(async () => {
  app.dock?.hide();
  const root=await mkdtemp(join(tmpdir(),'toby-grok-approval-')),store=new Store(root),mcp=new McpHost();
  const approvals=new Map<string,Approval>(),listeners=new Set<()=>void>();let harness:Harness;
  const changed=()=>{if(harness)for(const approval of harness.pendingApprovals)approvals.set(approval.id,approval);for(const listener of [...listeners])listener();};
  const providers=new Providers(root,changed);
  try {
    const directory=join(root,'runtimes/grok/bin');await mkdir(directory,{recursive:true});
    await copyFile('tests/fixtures/grok-permission.cjs',join(directory,'grok'));await chmod(join(directory,'grok'),0o755);
    Object.assign(providers.states.find(state=>state.provider==='grok')!,{installed:true,connected:true,models:[{id:'fixture-grok',name:'Fixture Grok'}]});
    await mcp.start();harness=new Harness(store,providers,mcp,{close(){}} as any,'/unused',changed);
    const agent=harness.saveAgent({name:'Toby',personality:'',specialization:'',provider:'grok',model:'fixture-grok'});
    await assert.rejects(()=>providers.turn({agent,chatId:agent.id,prompt:'Never start',instructions:'',signal:new AbortController().signal,onText:()=>{},approve:async()=>{throw Error('Must not ask');},tools:[],callTool:async()=>{},connectors:[{id:'shadow',name:'Toby__shadow',command:'/unused',args:[],enabled:true}]}),/reserved Toby name/);
    const wait=(check:()=>boolean)=>new Promise<void>((resolve,reject)=>{let timer:ReturnType<typeof setTimeout>;const update=()=>{if(check()){clearTimeout(timer);listeners.delete(update);resolve();}};listeners.add(update);timer=setTimeout(()=>{listeners.delete(update);reject(Error('Approval fixture timed out'));},5000);update();});
    const task=(prompt:string)=>store.all<Task>('tasks').findLast(task=>task.prompt===prompt)!;
    const done=(prompt:string)=>wait(()=>task(prompt)?.status==='done');

    await harness.send(agent.id,'case:list');await done('case:list');
    assert.equal(approvals.size,0);assert.equal(task('case:list').result,'Checked your team.');

    await harness.send(agent.id,'case:command');await wait(()=>harness.pendingApprovals.length===1);
    let approval=harness.pendingApprovals[0];assert.equal(approval.title,'Run a command');assert.match(approval.detail,/MUST_NOT_EXECUTE/);
    harness.resolveApproval(approval.id,false);await done('case:command');
    assert.equal(approvals.size,1);assert.match(task('case:command').result!,/Command declined/);

    await harness.send(agent.id,'case:native');await wait(()=>harness.pendingApprovals.length===1);
    approval=harness.pendingApprovals[0];assert.equal(approval.title,'Run a terminal command?');assert.match(approval.detail,/NATIVE_ACTION/);assert(approval.technicalDetails?.includes('rawInput'));assert(!approval.detail.includes('rawInput'));
    harness.resolveApproval(approval.id,false);await done('case:native');assert.match(task('case:native').result!,/deny-specific-once/);

    await harness.send(agent.id,'case:external');await wait(()=>harness.pendingApprovals.length===1);
    approval=harness.pendingApprovals[0];assert.equal(approval.title,'Delete event?');assert.match(approval.detail,/calendar/);assert.match(approval.detail,/event-123/);assert(!approval.detail.includes('calendar__delete_event'));
    harness.resolveApproval(approval.id,true);await done('case:external');assert.match(task('case:external').result!,/allow-specific-once/);

    await harness.send(agent.id,'case:opaque');await wait(()=>harness.pendingApprovals.length===1);
    approval=harness.pendingApprovals[0];assert.equal(approval.canApprove,false);assert(!approval.detail.includes('hidden'));
    harness.resolveApproval(approval.id,true);await done('case:opaque');assert.match(task('case:opaque').result!,/deny-specific-once/);

    const count=approvals.size;
    for(const prompt of ['case:wrong-session','case:no-once']){await harness.send(agent.id,prompt);await done(prompt);assert.match(task(prompt).result!,/cancelled/);}
    assert.equal(approvals.size,count);
    await harness.send(agent.id,'case:cancel');await wait(()=>harness.pendingApprovals.length===1);await harness.stop(agent.id);await wait(()=>task('case:cancel')?.status==='interrupted');assert.equal(harness.pendingApprovals.length,0);
    // A user-saved native terminal grant also covers the task-bound Toby command.
    await harness.send(agent.id,'case:native');await wait(()=>harness.pendingApprovals.length===1);
    harness.resolveApproval(harness.pendingApprovals[0].id,true,true);await done('case:native');assert.deepEqual(store.preferences.allowedActions,['terminal']);
    const grantedCount=approvals.size;
    await harness.send(agent.id,'case:command');await done('case:command');assert.match(task('case:command').result!,/Exit 0.*MUST_NOT_EXECUTE/s);assert.equal(approvals.size,grantedCount);
    await harness.send(agent.id,'case:native');await done('case:native');assert.equal(approvals.size,grantedCount);assert.match(task('case:native').result!,/allow-specific-once/);
    store.setPreferences({permissionMode:'full',allowedActions:[]});harness.refreshPermissions();
    await harness.send(agent.id,'case:external');await done('case:external');assert.equal(approvals.size,grantedCount);
    await harness.send(agent.id,'case:opaque');await wait(()=>harness.pendingApprovals.length===1);harness.resolveApproval(harness.pendingApprovals[0].id,true,true);await done('case:opaque');assert.match(task('case:opaque').result!,/deny-specific-once/);
    store.setPreferences({permissionMode:'ask',allowedActions:[]});harness.refreshPermissions();
    await harness.send(agent.id,'case:native');await wait(()=>harness.pendingApprovals.length===1);harness.resolveApproval(harness.pendingApprovals[0].id,false);await done('case:native');
    console.log('GROK_APPROVAL_PASS: exact reported lookup without prompt; command denied at Harness once; native/connector actions retain readable approval; exact option IDs, session isolation and once-only scope and cancellation preserved');
  } finally {if(harness!)await harness.shutdown();await providers.shutdown();await mcp.dispose();store.close();await rm(root,{recursive:true,force:true});}
  app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
