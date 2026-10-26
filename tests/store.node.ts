import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store.ts';
const dirs:string[]=[];afterEach(()=>{for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
const open=()=>{const dir=mkdtempSync(join(tmpdir(),'toby-store-'));dirs.push(dir);return new Store(dir);};
const input={name:'Toby',personality:'Direct',specialization:'Research',provider:'openai' as const,model:'test'};
test('agent identity, local transcript and group membership survive restart independently of model',()=>{let s=open();const root=s.root;const a=s.saveAgent(input);const b=s.saveAgent({...input,name:'Researcher',provider:'grok'});const g=s.saveGroup({name:'Team',instructions:'Work together',members:[a.id,b.id]});s.addMessage({chatId:g.id,senderId:a.id,role:'assistant',text:'Handing this to my colleague',status:'done'});s.saveAgent({...a,model:'replacement'});s.close();s=new Store(root);assert.equal(s.all<any>('agents')[0].id,a.id);assert.equal(s.all<any>('agents')[0].model,'replacement');assert.deepEqual(s.all<any>('groups')[0].members,[a.id,b.id]);assert.equal(s.all<any>('messages')[0].senderId,a.id);s.close();});
test('uncertain running work becomes interrupted and is never blindly replayed',()=>{let s=open();const root=s.root;const a=s.saveAgent(input);const t=s.task({agentId:a.id,chatId:a.id,prompt:'External side effect'});s.put('tasks',{...t,status:'running'});s.put('agents',{...a,status:'working'});s.addMessage({chatId:a.id,senderId:a.id,role:'assistant',text:'Partial',status:'streaming'});s.close();s=new Store(root);assert.equal(s.get<any>('tasks',t.id).status,'interrupted');assert.equal(s.get<any>('agents',a.id).status,'idle');assert.equal(s.all<any>('messages')[0].status,'failed');s.close();});
test('transaction rolls back partial delegation state',()=>{const s=open();assert.throws(()=>s.transaction(()=>{s.saveAgent(input);throw Error('Simulated crash')}));assert.deepEqual(s.all('agents'),[]);s.close();});
test('waiting coordination pauses on restart and private replies retain their audience',()=>{let s=open();const root=s.root;const a=s.saveAgent(input);const t=s.task({agentId:a.id,chatId:a.id,prompt:'Coordinate'});s.put('tasks',{...t,status:'waiting'});const message=s.addMessage({chatId:a.id,senderId:a.id,role:'assistant',text:'Private work',audience:'internal',status:'done'});s.close();s=new Store(root);assert.equal(s.get<any>('tasks',t.id).status,'interrupted');assert.equal(s.get<any>('messages',message.id).audience,'internal');s.close();});

test('explicit agent and group pins persist and group edits retain their pin',()=>{let s=open();const root=s.root;const a=s.saveAgent(input);s.put('agents',{...a,pinned:true});const g=s.saveGroup({name:'Review',instructions:'',members:[a.id]});s.put('groups',{...g,pinned:true});s.saveGroup({...g,name:'Renamed review'});s.close();s=new Store(root);assert.equal(s.get<any>('agents',a.id).pinned,true);assert.equal(s.get<any>('groups',g.id).pinned,true);assert.equal(s.get<any>('groups',g.id).name,'Renamed review');s.close();});

test('emoji defaults and explicit choices persist while legacy avatars are not migrated on load',()=>{
 let s=open();const root=s.root;
 const first=s.saveAgent(input);
 assert.equal(first.avatar,'🦊');
 const specialist=s.saveAgent({...input,name:'Researcher'});
 const defaultAgent=s.saveAgent({...input,name:'Planner'});
 assert.ok(specialist.avatar&&specialist.avatar!=='toby');
 s.saveAgent({...specialist,avatar:'🐙'});
 s.put('agents',{...first,avatar:'toby'});
 s.close();s=new Store(root);
 assert.equal(s.get<any>('agents',first.id).avatar,'toby');
 assert.equal(s.get<any>('agents',defaultAgent.id).avatar,defaultAgent.avatar);
 assert.equal(s.get<any>('agents',specialist.id).avatar,'🐙');
 const edited=s.saveAgent({...input,id:specialist.id,name:'Analyst'});
 assert.equal(edited.avatar,'🐙');
 s.close();
});

test('permission choices default conservatively and persist independently of onboarding',()=>{
 let s=open();const root=s.root;
 assert.equal(s.preferences.permissionMode,'ask');assert.deepEqual(s.preferences.allowedActions,[]);assert.equal(s.preferences.notifyOnIntervention,true);
 s.setPreferences({permissionMode:'full',allowedActions:['terminal','browser'],notifyOnIntervention:false});s.close();s=new Store(root);
 assert.equal(s.preferences.permissionMode,'full');assert.deepEqual(s.preferences.allowedActions,['terminal','browser']);assert.equal(s.preferences.notifyOnIntervention,false);
 s.setPreferences({permissionMode:'ask',allowedActions:[]});s.close();s=new Store(root);assert.equal(s.preferences.permissionMode,'ask');assert.deepEqual(s.preferences.allowedActions,[]);
 s.put('settings',{id:'preferences',value:{onboardingComplete:true}});assert.equal(s.preferences.permissionMode,'ask');assert.deepEqual(s.preferences.allowedActions,[]);s.close();
});


test('per-agent permission overrides persist, survive ordinary edits, and reset explicitly',()=>{
 let s=open();const root=s.root;const a=s.saveAgent({...input,permissionMode:'ask'});s.setPreferences({permissionMode:'full'});s.close();s=new Store(root);
 assert.equal(s.get<any>('agents',a.id).permissionMode,'ask');s.saveAgent({...input,id:a.id,name:'Renamed'});assert.equal(s.get<any>('agents',a.id).permissionMode,'ask');
 s.saveAgent({...input,id:a.id,permissionMode:null});s.close();s=new Store(root);assert.equal(s.get<any>('agents',a.id).permissionMode,undefined);s.close();
});
