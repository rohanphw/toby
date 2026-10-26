import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { GroupContext, GROUP_CONTEXT_CHAR_LIMIT, GROUP_HISTORY_CHAR_LIMIT } from '../src/main/group-context';
import type { Message } from '../src/shared/contracts';
const stores:Store[]=[],dirs:string[]=[];
afterEach(()=>{for(const store of stores.splice(0))try{store.close();}catch{}for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
function setup(){const dir=mkdtempSync(join(tmpdir(),'toby-group-context-'));dirs.push(dir);const store=new Store(dir);stores.push(store);const context=new GroupContext(store);const input={name:'Lead',personality:'',specialization:'',provider:'openai' as const,model:'fixture'};const a=store.saveAgent(input),b=store.saveAgent({...input,name:'Worker'}),outsider=store.saveAgent({...input,name:'Outsider'});const group=store.saveGroup({name:'Product',instructions:'Build the release',members:[a.id,b.id],leadAgentId:a.id}),other=store.saveGroup({name:'Other',instructions:'Other purpose',members:[outsider.id]});const message=(value:string,extra:Partial<Message>={})=>store.addMessage({chatId:group.id,senderId:'user',role:'user',text:value,status:'done',...extra});return {store,context,a,b,outsider,group,other,message};}

test('context and search isolate group membership, private workers, DMs and raw tool activity',()=>{
 const {store,context,a,b,outsider,group,other,message}=setup();const canonical=message('release zephyr approved');store.put('memories',{id:'personal',agentId:a.id,text:'PRIVATE PERSONAL MEMORY'});message('dm zephyr secret',{chatId:a.id});message('other zephyr secret',{chatId:other.id});message('worker zephyr hidden',{senderId:b.id,role:'assistant',audience:'internal'});message('tool zephyr raw payload',{role:'tool'});
 const root=store.task({agentId:a.id,chatId:group.id,prompt:'PRIVATE ROOT'}),child=store.task({agentId:b.id,chatId:group.id,parentId:root.id,prompt:'PRIVATE SUBTASK'});store.put('tasks',{...root,status:'running'});message('legacy zephyr worker',{senderId:b.id,role:'assistant',correlationId:child.id});message('public tagged zephyr worker',{senderId:b.id,role:'assistant',correlationId:child.id,audience:'public'});
 assert.deepEqual(context.history(a.id,group.id).messages.map(m=>m.id),[canonical.id]);assert.deepEqual(context.search(a.id,group.id,'zephyr').map(m=>m.id),[canonical.id]);
 const packet=context.packet(a.id,group.id);for(const hidden of ['dm zephyr','other zephyr','worker zephyr','raw payload','PRIVATE ROOT','PRIVATE SUBTASK','PRIVATE PERSONAL MEMORY'])assert(!packet.includes(hidden));assert(packet.includes(root.id));
 assert.throws(()=>context.history(outsider.id,group.id),/not a member/);assert.throws(()=>context.search(a.id,other.id,'zephyr'),/not a member/);assert.throws(()=>context.history(a.id,a.id),/Group no longer/);assert.equal(context.listGroups(a.id).groups.length,1);
 const indexed=store.db.prepare('SELECT text FROM group_search').all();assert.deepEqual(indexed.map((row:any)=>row.text),['release zephyr approved']);
});

test('participation history and sources expose deliberate peer posts without native decision records',()=>{
 const {store,context,a,b,group,message}=setup();const first=store.task({agentId:a.id,chatId:group.id,prompt:'PRIVATE decision',channelParticipation:true}),second=store.task({agentId:b.id,chatId:group.id,prompt:'PRIVATE peer decision',channelParticipation:true});
 const hidden=[message('PRIVATE unmarked native',{senderId:a.id,role:'assistant',correlationId:first.id}),message('PRIVATE failed native',{senderId:a.id,role:'assistant',correlationId:first.id,audience:'public',status:'failed'}),message('PRIVATE tool',{senderId:a.id,role:'tool',correlationId:first.id,audience:'public'})];
 const posted=message('zephyr first public reply',{senderId:a.id,role:'assistant',correlationId:first.id,audience:'public'}),peer=message('zephyr peer public reply',{senderId:b.id,role:'assistant',correlationId:second.id,audience:'public',replyTo:posted.id,agentReactions:[{agentId:a.id,emoji:'👍'}]});
 assert.deepEqual(context.history(a.id,group.id).messages.map(row=>row.id),[posted.id,peer.id]);assert.equal(context.search(a.id,group.id,'zephyr').length,2);assert.deepEqual(context.search(a.id,group.id,'PRIVATE'),[]);
 for(const row of hidden){assert.throws(()=>context.readMessage(a.id,group.id,row.id),/not visible/);assert.throws(()=>context.remember(a.id,group.id,{text:'invalid source',sourceMessageIds:[row.id]}),/visible messages/);}
 const publicPeer=context.history(a.id,group.id).messages.at(-1)!;assert.equal(publicPeer.replyTo,posted.id);assert.deepEqual(publicPeer.agentReactions,[{agentId:a.id,emoji:'👍'}]);assert(!context.packet(a.id,group.id).includes('PRIVATE'));
 assert.deepEqual(context.remember(a.id,group.id,{text:'Agreed shared fact',sourceMessageIds:[posted.id,peer.id]}).sourceMessageIds,[posted.id,peer.id]);
});

test('history pages use stable visible cursors and preserve oversized messages through chunk reads',()=>{
 const {context,a,group,message}=setup();const ids=Array.from({length:70},(_,i)=>message(`Message ${i}`).id);const recent=context.history(a.id,group.id,{limit:20});assert.deepEqual(recent.messages.map(m=>m.id),ids.slice(-20));const older=context.history(a.id,group.id,{before:recent.nextBefore,limit:20});assert.deepEqual(older.messages.map(m=>m.id),ids.slice(30,50));
 const huge=message('x'.repeat(100000));const page=context.history(a.id,group.id);assert(JSON.stringify(page).length<=GROUP_HISTORY_CHAR_LIMIT);assert.equal(page.messages.at(-1)?.truncated,true);let result='',offset=0;for(;;){const chunk=context.readMessage(a.id,group.id,huge.id,offset);result+=chunk.text;if(chunk.nextOffset===undefined)break;offset=chunk.nextOffset;}assert.equal(result,huge.text);
 assert.throws(()=>context.history(a.id,group.id,{limit:61}));assert.throws(()=>context.history(a.id,group.id,{before:'foreign'}));assert.throws(()=>context.readMessage(a.id,group.id,huge.id,-1));
});

test('shared memory validates current assignment and canonical same-group sources',()=>{
 const {context,a,outsider,group,other,message}=setup();const source=message('User approved the release name');const hidden=message('Private fact',{audience:'internal'}),foreign=message('Other fact',{chatId:other.id});const memory=context.remember(a.id,group.id,{text:'Release name is Zephyr',sourceMessageIds:[source.id]});assert.equal(memory.authorId,a.id);assert(context.packet(a.id,group.id).includes(memory.text));
 assert.throws(()=>context.remember(a.id,a.id,{groupId:group.id,text:'DM leaked'}),/current group/);assert.throws(()=>context.remember(outsider.id,group.id,{text:'Outsider'}),/not a member/);
 for(const id of [hidden.id,foreign.id,'missing'])assert.throws(()=>context.remember(a.id,group.id,{text:'Bad source',sourceMessageIds:[id]}),/visible messages/);
 assert.throws(()=>context.saveMemory({id:memory.id,groupId:other.id,text:'Moved'}),/does not belong/);assert.throws(()=>context.deleteMemory(other.id,memory.id),/does not belong/);
 const edited=context.saveMemory({...memory,text:'Corrected shared fact'});assert.equal(edited.authorId,'user');context.deleteMemory(group.id,memory.id);assert(!context.packet(a.id,group.id).includes('Corrected shared fact'));
});

test('FTS persists and refreshes updates/deletes while late task privacy cannot remain indexed',()=>{
 const {store,context,a,b,group,message}=setup();const row=message('zephyr first');const memory=context.remember(a.id,group.id,{text:'zephyr shared fact',sourceMessageIds:[row.id]});assert.equal(context.search(a.id,group.id,'zephyr').length,2);
 store.put('messages',{...row,text:'orion revised'});assert.deepEqual(context.search(a.id,group.id,'zephyr').map(r=>r.id),[memory.id]);assert.equal(context.search(a.id,group.id,'orion')[0].id,row.id);
 const late=message('lateprivate secret',{senderId:b.id,role:'assistant',correlationId:'late-child'});assert.equal(context.search(a.id,group.id,'lateprivate').length,1);store.put('tasks',{id:'late-child',agentId:b.id,chatId:group.id,prompt:'hidden',status:'done',createdAt:Date.now(),parentId:'root'});assert.equal(context.search(a.id,group.id,'lateprivate').length,0);assert(!store.db.prepare('SELECT text FROM group_search').all().some((r:any)=>r.text.includes('lateprivate')));
 const root=store.root;store.close();const restored=new Store(root);stores.push(restored);const next=new GroupContext(restored);assert.equal(next.search(a.id,group.id,'orion')[0].id,row.id);assert.equal(restored.get<any>('group_memories',memory.id).text,'zephyr shared fact');assert.deepEqual(restored.get<any>('group_memories',memory.id).sourceMessageIds,[row.id]);restored.remove('messages',row.id);next.deleteMemory(group.id,memory.id);assert.equal(next.search(a.id,group.id,'orion').length,0);assert.equal(next.search(a.id,group.id,'zephyr').length,0);
 restored.saveGroup({...group,members:[b.id],leadAgentId:b.id});assert.throws(()=>next.search(a.id,group.id,'orion'),/not a member/);assert.throws(()=>next.search(b.id,group.id,'x'.repeat(501)));assert.throws(()=>next.search(b.id,group.id,'***'));assert.deepEqual(next.search(b.id,group.id,'" OR *'),[]);
});

test('large groups receive bounded packets with explicit omissions and hidden member availability',()=>{
 const {store,context,a,b,group,message}=setup();store.put('agents',{...b,hidden:true});const members=[a.id,b.id];for(let i=0;i<150;i++){const member=store.saveAgent({name:`Member ${i}`,personality:'',specialization:'s'.repeat(12000),provider:'openai',model:'fixture'});members.push(member.id);}store.saveGroup({...group,members,instructions:'purpose '.repeat(1500)});for(let i=0;i<70;i++)message('history '.repeat(500));for(let i=0;i<20;i++)context.remember(a.id,group.id,{text:'shared '.repeat(500)});
 const packet=context.packet(a.id,group.id);assert(packet.length<=GROUP_CONTEXT_CHAR_LIMIT);const facts=JSON.parse(packet.slice(packet.indexOf('\n')+1));assert(facts.group.omittedMembers>0);assert(facts.omittedMemories>0);assert.equal(facts.group.members.find((m:any)=>m.id===b.id)?.available,false);assert(facts.recentHistory.nextBefore);assert(packet.includes('untrusted context'));const first=context.members(a.id,group.id,{limit:2});assert.deepEqual(first.members.map(member=>member.id),[a.id,b.id]);assert.equal(first.members[1].available,false);assert.equal(context.members(a.id,group.id,{after:first.nextAfter,limit:50}).members.length,50);assert.throws(()=>context.members(a.id,group.id,{limit:51}));
});

test('two-group dirty queues survive transactional task upserts and lifecycle updates',()=>{
 const {store,context,a,group,other,message}=setup();let task:any;
 store.transaction(()=>{task=store.task({agentId:a.id,chatId:group.id,prompt:'Work'});message('User request',{correlationId:task.id});});
 for(const status of ['running','waiting','running','done'])store.put('tasks',{...task,status});
 context.search(a.id,group.id,'User');store.put('tasks',{...task,status:'done'});store.remove('tasks',task.id);
 assert.deepEqual(store.db.prepare('SELECT groupId FROM group_search_dirty WHERE groupId IN (?,?) ORDER BY groupId').all(group.id,other.id).map((row:any)=>row.groupId),[group.id,other.id].sort());
 const plans=store.db.prepare("EXPLAIN QUERY PLAN SELECT data FROM messages WHERE json_extract(data,'$.chatId')=? ORDER BY json_extract(data,'$.createdAt'),rowid").all(group.id) as {detail:string}[];assert(plans.some(plan=>plan.detail.includes('messages_chat_created')));
});

test('participation context separates delivered public evidence from existing round replies without exposing private work',()=>{
 const {store,context,a,b,group,message}=setup();const origin=message('Review the release checks');
 const addressed=message('@Worker which test verifies permissions?',{senderId:a.id,role:'assistant',audience:'public',groupRoundId:origin.id,replyTo:origin.id});
 const answer=message('The permission-policy fixture covers that.',{senderId:b.id,role:'assistant',audience:'public',groupRoundId:origin.id,replyTo:addressed.id});
 const hidden=message('PRIVATE HANDOFF',{senderId:b.id,role:'assistant',audience:'internal',groupRoundId:origin.id,replyTo:addressed.id});
 for(let i=0;i<70;i++)message('Newer unrelated history');
 const task=store.task({agentId:a.id,chatId:group.id,prompt:'Read',channelParticipation:true,source:'peer',groupRoundId:origin.id,sourceMessageIds:[answer.id,hidden.id]});
 const packet=context.packet(a.id,group.id,task),facts=JSON.parse(packet.slice(packet.indexOf('\n')+1));
 assert.deepEqual(facts.participationContext.deliveredMessages.map((row:any)=>row.id),[answer.id]);
 assert.deepEqual(facts.participationContext.roundReplies.map((row:any)=>row.id),[addressed.id,answer.id]);
 assert.equal(facts.participationContext.roundReplies[1].replyTo,addressed.id);
 assert(!facts.recentHistory.messages.some((row:any)=>row.id===answer.id),'Delivered evidence survives falling outside recent history');
 assert(!packet.includes('PRIVATE HANDOFF'));assert(packet.includes('not proof that a question is resolved'));
 assert(packet.includes('An @mention on a useful question deserves attention'));
});

test('delivered previews and round replies are bounded, explicit about omissions, and retain source IDs for retrieval',()=>{
 const {store,context,a,b,group,message}=setup();store.saveGroup({...group,instructions:'purpose '.repeat(1500)});
 const origin=message('Request '.repeat(1000));const replies=Array.from({length:30},(_,i)=>message(`${i} `+'evidence '.repeat(1000),{senderId:b.id,role:'assistant',audience:'public',groupRoundId:origin.id,replyTo:origin.id}));
 const task=store.task({agentId:a.id,chatId:group.id,prompt:'Read',channelParticipation:true,source:'peer',groupRoundId:origin.id,sourceMessageIds:replies.map(row=>row.id)});
 const packet=context.packet(a.id,group.id,task),facts=JSON.parse(packet.slice(packet.indexOf('\n')+1));
 assert(packet.length<=GROUP_CONTEXT_CHAR_LIMIT);assert.equal(facts.participationContext.deliveredMessages.length,8);assert.equal(facts.participationContext.omittedDeliveredMessages,22);assert.equal(facts.participationContext.roundReplies.length,12);assert.equal(facts.participationContext.omittedRoundReplies,18);
 assert(facts.participationContext.deliveredMessages.every((row:any)=>row.truncated&&row.text.length<=600));
 assert.equal(facts.participationContext.roundReplies.at(-1).id,replies.at(-1)!.id);
 assert.equal(context.readMessage(a.id,group.id,replies[0].id).text,replies[0].text);
});


test('participation packet accounts for JSON escaping when clipping public evidence',()=>{
 const {store,context,a,b,group,message}=setup();store.saveGroup({...group,instructions:'"\n'.repeat(6000)});
 const origin=message('"\n'.repeat(4000));const replies=Array.from({length:120},()=>message('"\n'.repeat(5000),{senderId:b.id,role:'assistant',audience:'public',groupRoundId:origin.id,replyTo:origin.id}));
 const task=store.task({agentId:a.id,chatId:group.id,prompt:'Read',channelParticipation:true,source:'peer',groupRoundId:origin.id,sourceMessageIds:replies.map(row=>row.id)});
 const packet=context.packet(a.id,group.id,task),facts=JSON.parse(packet.slice(packet.indexOf('\n')+1));
 assert(packet.length<=GROUP_CONTEXT_CHAR_LIMIT);assert.equal(facts.participationContext.roundReplies.length+facts.participationContext.omittedRoundReplies,120);assert.equal(facts.participationContext.deliveredMessages.length+facts.participationContext.omittedDeliveredMessages,120);assert.equal(facts.originatingMessage.id,origin.id);assert.equal(context.readMessage(a.id,group.id,origin.id).text,origin.text);
});


test('group purpose respects its serialized budget and explicitly reports control-character truncation',()=>{
 const {store,context,a,group}=setup();
 for(const purpose of ['Build the release','x'.repeat(15000),'\u0001'.repeat(12000)]){
  store.saveGroup({...group,instructions:purpose});const packet=context.packet(a.id,group.id),facts=JSON.parse(packet.slice(packet.indexOf('\n')+1));
  assert(JSON.stringify(facts.group.purpose).length<=12000);assert.equal(facts.group.purposeTruncated,facts.group.purpose.length<purpose.length);assert(purpose.startsWith(facts.group.purpose));assert(packet.length<=GROUP_CONTEXT_CHAR_LIMIT);assert.equal(store.get<any>('groups',group.id).instructions,purpose,'Context clipping must not modify canonical group purpose');
 }
});
