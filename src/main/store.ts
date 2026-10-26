import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Agent, AgentInput, Group, Message, Task, GroupDelivery, Preferences } from '../shared/contracts';
import { agentAvatar } from '../shared/avatar';
type Tables = 'agents'|'groups'|'messages'|'tasks'|'routines'|'skills'|'memories'|'connectors'|'settings'|'attachments'|'group_memories'|'group_deliveries';
export class Store {
 readonly db: DatabaseSync;
 constructor(readonly root: string) {
  mkdirSync(root,{recursive:true,mode:0o700}); this.db = new DatabaseSync(join(root,'toby.sqlite'));
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  for(const t of ['agents','groups','messages','tasks','routines','skills','memories','connectors','settings','attachments','group_memories','group_deliveries']) this.db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  this.recover();
 }
 all<T>(table:Tables): T[] { return (this.db.prepare(`SELECT data FROM ${table} ORDER BY rowid`).all() as {data:string}[]).map(r=>JSON.parse(r.data)); }
 get<T>(table:Tables,id:string): T|undefined { const r=this.db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id) as {data:string}|undefined; return r?JSON.parse(r.data):undefined; }
 put<T extends {id:string}>(table:Tables,value:T):T { this.db.prepare(`INSERT INTO ${table}(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(value.id,JSON.stringify(value)); return value; }
 remove(table:Tables,id:string) { this.db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id); }
 transaction<T>(fn:()=>T):T {this.db.exec('BEGIN IMMEDIATE');try{const v=fn();this.db.exec('COMMIT');return v;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 get preferences():Preferences {return {onboardingComplete:false,autoCreateAgents:false,maxConcurrency:3,voice:'0',permissionMode:'ask',allowedActions:[],notifyOnIntervention:true,...this.get<{value:Partial<Preferences>}>('settings','preferences')?.value};}
 setPreferences(input:Partial<Preferences>) {this.put('settings',{id:'preferences',value:{...this.preferences,...input}});}
 saveAgent(input:AgentInput):Agent {const old=input.id?this.get<Agent>('agents',input.id):undefined;if(input.id&&!old)throw Error('Agent no longer exists');const id=old?.id??randomUUID();const a:Agent={id,name:input.name.trim(),personality:input.personality.trim(),specialization:input.specialization.trim(),provider:input.provider,model:input.model,avatar:agentAvatar({id,name:input.name.trim(),avatar:input.avatar??old?.avatar}),status:old?.status??'idle',pinned:old?.pinned,hidden:old?.hidden,permissionMode:input.permissionMode===null?undefined:input.permissionMode??old?.permissionMode,workspace:old?.workspace??join(this.root,'workspaces',id),createdAt:old?.createdAt??Date.now()};mkdirSync(a.workspace,{recursive:true});return this.put('agents',a);}
 saveGroup(input:{id?:string;name:string;instructions:string;members:string[];leadAgentId?:string}):Group {const old=input.id?this.get<Group>('groups',input.id):undefined;const members=[...new Set(input.members)];if(input.leadAgentId!==undefined&&!members.includes(input.leadAgentId))throw Error('The group lead must be a member');const leadAgentId=input.leadAgentId??(old?.leadAgentId&&members.includes(old.leadAgentId)?old.leadAgentId:members[0]);return this.put('groups',{id:input.id??randomUUID(),name:input.name.trim(),instructions:input.instructions.trim(),members,leadAgentId,pinned:old?.pinned,createdAt:old?.createdAt??Date.now()});}
 addMessage(input:Omit<Message,'id'|'createdAt'>):Message {return this.put('messages',{id:randomUUID(),createdAt:Date.now(),...input});}
 task(input:Pick<Task,'chatId'|'agentId'|'prompt'> & {displayPrompt?:string;historyMessageIds?:string[];source?:Task['source'];parentId?:string;rootId?:string;hops?:number;channelParticipation?:boolean;sourceMessageIds?:string[];groupRoundId?:string}):Task {return this.put('tasks',{id:randomUUID(),createdAt:Date.now(),status:'queued',...input});}
 recover(){for(const receipt of this.all<GroupDelivery>('group_deliveries'))if(receipt.state==='processing')this.put('group_deliveries',{...receipt,state:'interrupted'});for(const a of this.all<Agent>('agents'))if(a.status!=='idle')this.put('agents',{...a,status:'idle'});for(const t of this.all<Task>('tasks'))if(t.status==='running'||t.status==='waiting')this.put('tasks',{...t,status:'interrupted',result:'Toby stopped during this task. Review its history before continuing.'});for(const m of this.all<Message>('messages'))if(m.status==='streaming')this.put('messages',{...m,status:'failed'});}
 close(){this.db.close();}
}
