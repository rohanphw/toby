import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { GroupConversation } from '../src/main/group-conversation';
import type { GroupDelivery, Task } from '../src/shared/contracts';

test('broadcast receipts deduplicate, coalesce, preserve new rounds, recover and bound public replies',()=>{
 const root=mkdtempSync(join(tmpdir(),'toby-delivery-'));let store=new Store(root);
 try{
  const a=store.saveAgent({name:'A',personality:'',specialization:'',provider:'openai',model:'fixture'}),b=store.saveAgent({...a,id:undefined,name:'B'}),c=store.saveAgent({...a,id:undefined,name:'Hidden'});store.put('agents',{...c,hidden:true});
  const group=store.saveGroup({name:'Team',instructions:'',members:[a.id,b.id,c.id]});let conversation=new GroupConversation(store);
  const first=store.addMessage({chatId:group.id,senderId:'user',role:'user',text:'@A everyone reads',audience:'public'});
  store.transaction(()=>{conversation.deliver(group,first,'user');conversation.deliver(group,first,'user');});
  assert.equal(store.all<GroupDelivery>('group_deliveries').length,2);assert.equal(store.all<Task>('tasks').length,2);
  const second=store.addMessage({chatId:group.id,senderId:'user',role:'user',text:'Second human event',audience:'public'});store.transaction(()=>conversation.deliver(group,second,'user'));
  assert.equal(store.all<Task>('tasks').length,2);assert(store.all<Task>('tasks').every(task=>task.sourceMessageIds?.length===2));
  const active=store.all<Task>('tasks').find(task=>task.agentId===a.id)!;store.transaction(()=>{store.put('tasks',{...active,status:'running'});conversation.start(active);});
  const peer=store.addMessage({chatId:group.id,senderId:b.id,role:'assistant',text:'Earlier round reply',audience:'public',groupRoundId:first.id});store.transaction(()=>conversation.deliver(group,peer,'user'));
  const queued=store.all<Task>('tasks').find(task=>task.agentId===a.id&&task.status==='queued')!;assert(queued);assert.equal(queued.sourceMessageIds?.length,1);assert.equal(store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.messageId===peer.id).length,1);
  const third=store.addMessage({chatId:group.id,senderId:'user',role:'user',text:'Newest human event',audience:'public'});store.transaction(()=>conversation.deliver(group,third,'user'));
  const stale=store.addMessage({chatId:group.id,senderId:b.id,role:'assistant',text:'Old routine reply',audience:'public',groupRoundId:first.id});store.transaction(()=>conversation.deliver(group,stale,'user'));
  assert.equal(store.get<Task>('tasks',queued.id)?.groupRoundId,first.id);assert.equal(store.get<Task>('tasks',queued.id)?.source,'peer');assert(store.all<Task>('tasks').some(task=>task.agentId===a.id&&task.source==='user'&&task.groupRoundId===third.id));
  conversation.react(active,first.id,'👍');conversation.react(active,first.id,'👍');assert.equal(store.get<any>('messages',first.id).agentReactions.length,1);
  assert.throws(()=>conversation.react({...active,parentId:'private'},first.id,'👍'),/active group member/);assert.throws(()=>conversation.react(active,first.id,'PRIVATE'),/Invalid reaction/);
  const hidden=store.addMessage({chatId:group.id,senderId:a.id,role:'assistant',text:'Private',audience:'internal'});assert.throws(()=>conversation.react(active,hidden.id,'👍'),/visible public/);
  for(let i=0;i<2;i++)store.addMessage({chatId:group.id,senderId:a.id,role:'assistant',text:`reply ${i}`,audience:'public',groupRoundId:third.id});assert.equal(conversation.canPost({...active,groupRoundId:third.id}),false);assert.equal(conversation.canPost({...active,agentId:b.id,groupRoundId:third.id}),true);
  store.close();store=new Store(root);conversation=new GroupConversation(store);
  assert.equal(store.get<Task>('tasks',active.id)?.status,'interrupted');assert(store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.taskId===active.id).every(receipt=>receipt.state==='interrupted'));
  assert.equal(store.get<Task>('tasks',queued.id)?.status,'queued');assert(store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.taskId===queued.id).every(receipt=>receipt.state==='queued'));
  assert.equal(store.get<any>('messages',first.id).agentReactions[0].agentId,a.id);
  const resumed=store.transaction(()=>{const next=store.task({chatId:active.chatId,agentId:active.agentId,prompt:active.prompt,channelParticipation:true,source:active.source,groupRoundId:active.groupRoundId,sourceMessageIds:active.sourceMessageIds});conversation.resume(active,next);return next;});assert(store.all<GroupDelivery>('group_deliveries').some(receipt=>receipt.taskId===resumed.id&&receipt.state==='queued'));store.transaction(()=>{conversation.start(resumed);conversation.finish(resumed,'done');});assert(store.all<GroupDelivery>('group_deliveries').filter(receipt=>receipt.taskId===resumed.id).every(receipt=>receipt.state==='done'));
 }finally{store.close();rmSync(root,{recursive:true,force:true});}
});
