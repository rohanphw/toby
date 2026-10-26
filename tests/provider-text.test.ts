import { expect, test } from 'bun:test';
import { CodexFinalText, GrokFinalText } from '../src/main/provider-text';

const threadId='thread',turnId='turn';
function codex() {const reply=new CodexFinalText(threadId);reply.bindTurn(turnId);return reply;}
function item(reply:CodexFinalText,id:string,text:string,phase?:string,method='item/completed') {
 return reply.accept(method,{threadId,turnId,item:{id,type:'agentMessage',text,phase}});
}
function delta(reply:CodexFinalText,id:string,text:string,scope={threadId,turnId}) {
 return reply.accept('item/agentMessage/delta',{...scope,itemId:id,delta:text});
}
function end(reply:CodexFinalText,status='completed') {
 return reply.accept('turn/completed',{threadId,turn:{id:turnId,status}});
}
function update(reply:GrokFinalText,sessionUpdate:string,extra:Record<string,unknown>={},sessionId='session') {
 reply.accept('session/update',{sessionId,update:{sessionUpdate,...extra}});
}
function chunk(reply:GrokFinalText,text:string,sessionId='session') {
 update(reply,'agent_message_chunk',{content:{type:'text',text}},sessionId);
}

test('Codex commentary and private items never become the final reply',()=>{
 const reply=codex();
 expect(item(reply,'comment','I will check the files.','commentary')).toBeUndefined();
 reply.accept('item/completed',{threadId,turnId,item:{id:'thought',type:'reasoning',text:'PRIVATE'}});
 reply.accept('item/completed',{threadId,turnId,item:{id:'tool',type:'commandExecution',text:'RAW TOOL OUTPUT'}});
 expect(item(reply,'answer','The file is ready.','final_answer')).toBeUndefined();
 expect(end(reply)).toEqual({text:'The file is ready.'});
});

test('Codex buffers unknown phase and honors a late commentary classification',()=>{
 const reply=codex();
 expect(delta(reply,'comment','INTERNAL PLAN')).toBeUndefined();
 item(reply,'comment','INTERNAL PLAN','commentary');
 delta(reply,'answer','Final');
 item(reply,'answer','Final answer','final_answer');
 expect(end(reply)).toEqual({text:'Final answer'});
});

test('Codex authoritative completion replaces provisional deltas without duplication',()=>{
 const reply=codex();
 item(reply,'answer','','final_answer','item/started');
 delta(reply,'answer','Draft with a mistake');
 item(reply,'answer','Correct answer','final_answer');
 delta(reply,'answer',' late duplicate');
 expect(end(reply)).toEqual({text:'Correct answer'});
 expect(end(reply)).toBeUndefined();
});

test('Codex selects the last final item and excludes later commentary',()=>{
 const reply=codex();
 item(reply,'first','First draft','final_answer');
 item(reply,'last','Final deliverable','final_answer');
 item(reply,'comment','Private follow-up','commentary');
 expect(end(reply)).toEqual({text:'Final deliverable'});
});

test('Codex late phase correction can retract a provisional final before publication',()=>{
 const reply=codex();
 item(reply,'candidate','','final_answer','item/started');
 delta(reply,'candidate','Actually interim');
 item(reply,'candidate','Actually interim','commentary');
 expect(end(reply)).toEqual({text:''});
});

test('Codex ignores other threads, turns and unscoped notifications',()=>{
 const reply=codex();
 delta(reply,'answer','WRONG THREAD',{threadId:'other',turnId});
 delta(reply,'answer','WRONG TURN',{threadId,turnId:'other'});
 reply.accept('item/completed',{item:{id:'answer',type:'agentMessage',text:'UNSCOPED',phase:'final_answer'}});
 expect(reply.accept('turn/completed',{threadId:'other',turn:{id:turnId,status:'completed'}})).toBeUndefined();
 expect(reply.accept('turn/completed',{threadId,turn:{id:'other',status:'completed'}})).toBeUndefined();
 expect(reply.accept('error',{threadId,turnId:'other',error:{message:'Foreign error'}})).toBeUndefined();
 item(reply,'answer','Scoped reply','final_answer');
 expect(end(reply)).toEqual({text:'Scoped reply'});
});

test('Codex handles notifications before turn/start responds without trusting a foreign turn',()=>{
 const reply=new CodexFinalText(threadId);
 item(reply,'answer','Early reply','final_answer');
 reply.accept('turn/completed',{threadId,turn:{id:'other',status:'completed'}});
 end(reply);
 expect(reply.bindTurn(turnId)).toEqual({text:'Early reply'});
});

test('Codex legacy fallback requires a completed unphased item after the last work boundary',()=>{
 const reply=codex();
 item(reply,'interim','I will inspect it.');
 reply.accept('item/started',{threadId,turnId,item:{id:'tool',type:'commandExecution'}});
 item(reply,'final','Inspected successfully.');
 expect(end(reply)).toEqual({text:'Inspected successfully.'});
 const noFinal=codex();
 item(noFinal,'interim','I will inspect it.');
 noFinal.accept('item/started',{threadId,turnId,item:{id:'tool',type:'commandExecution'}});
 expect(end(noFinal)).toEqual({text:''});
 const completedTool=codex();item(completedTool,'interim','I will inspect it.');
 completedTool.accept('item/completed',{threadId,turnId,item:{id:'tool',type:'commandExecution',aggregatedOutput:'PRIVATE'}});
 expect(end(completedTool)).toEqual({text:''});
 const uncompleted=codex();delta(uncompleted,'unknown','Provisional');
 expect(end(uncompleted)).toEqual({text:''});
});

test('Codex never treats an unknown phase or mixed phased/unphased turn as legacy final',()=>{
 const reply=codex();item(reply,'unknown','Unknown phase','analysis');
 expect(end(reply)).toEqual({text:''});
 const mixed=codex();item(mixed,'comment','Working','commentary');item(mixed,'unphased','Not classified');
 expect(end(mixed)).toEqual({text:''});
});

test('Codex errors, interruptions and cancellation discard all buffered text',()=>{
 for(const status of ['failed','interrupted','inProgress']) {
  const reply=codex();item(reply,'answer','UNPUBLISHED','final_answer');
  const result=end(reply,status);expect(result?.text).toBe('');expect(result?.error).toBeTruthy();
  expect(end(reply)).toBeUndefined();
 }
 const error=codex();item(error,'answer','UNPUBLISHED','final_answer');
 expect(error.accept('error',{threadId,turnId,willRetry:false,error:{message:'Failed'}})).toEqual({text:'',error:'Failed'});
 const stopped=codex();item(stopped,'answer','UNPUBLISHED','final_answer');stopped.stop();
 expect(end(stopped)).toBeUndefined();
});

test('Codex retriable errors do not publish or discard the eventual answer',()=>{
 const reply=codex();
 expect(reply.accept('error',{threadId,turnId,willRetry:true,error:{message:'Retrying'}})).toBeUndefined();
 item(reply,'answer','Recovered','final_answer');expect(end(reply)).toEqual({text:'Recovered'});
});

test('Final Markdown, code, JSON and ordinary mentions of thinking remain byte-for-byte intact',()=>{
 const text='I think this is the requested result.\n\n# Result\n\n- [File](./output.md)\n\n```json\n{"analysis":"requested data","tool":"hammer"}\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n';
 const reply=codex();item(reply,'answer',text,'final_answer');expect(end(reply)).toEqual({text});
 const grok=new GrokFinalText('session');chunk(grok,text);expect(grok.finish('end_turn')).toEqual({text});
});

test('Grok discards pre-tool prose and thought content, then selects the final segment',()=>{
 const reply=new GrokFinalText('session');
 chunk(reply,'Let me inspect that.');
 update(reply,'tool_call',{toolCallId:'tool',rawInput:{text:'PRIVATE INPUT'}});
 update(reply,'tool_call_update',{toolCallId:'tool',rawOutput:'PRIVATE OUTPUT'});
 update(reply,'agent_thought_chunk',{content:{type:'text',text:'PRIVATE REASONING'}});
 chunk(reply,'Here is ');chunk(reply,'the result.');
 expect(reply.finish('end_turn')).toEqual({text:'Here is the result.'});
});

test('Grok thought boundaries discard earlier prose without retaining the thought',()=>{
 const reply=new GrokFinalText('session');chunk(reply,'Interim sentence');
 update(reply,'agent_thought_chunk',{content:{type:'text',text:'PRIVATE'}});
 chunk(reply,'Answer');expect(reply.finish('end_turn')).toEqual({text:'Answer'});
});

test('Grok first tool updates establish boundaries and late known updates preserve the final',()=>{
 const reply=new GrokFinalText('session');chunk(reply,'Interim');
 update(reply,'tool_call_update',{toolCallId:'tool',status:'in_progress'});
 chunk(reply,'Final');
 update(reply,'tool_call_update',{toolCallId:'tool',status:'completed',content:[{text:'PRIVATE'}]});
 expect(reply.finish('end_turn')).toEqual({text:'Final'});
});

test('Grok accepts only the active session text content, never resources, images, plans or tools',()=>{
 const reply=new GrokFinalText('session');chunk(reply,'FOREIGN','other');
 update(reply,'agent_message_chunk',{content:{type:'image',text:'IMAGE PAYLOAD'}});
 update(reply,'agent_message_chunk',{content:{type:'resource',resource:{text:'RESOURCE PAYLOAD'}}});
 update(reply,'plan',{entries:[{content:'PRIVATE PLAN'}]});
 chunk(reply,'Answer');
 update(reply,'tool_call',{toolCallId:'foreign'},'other');
 expect(reply.finish('end_turn')).toEqual({text:'Answer'});
});

test('Grok non-success terminal responses and stop discard provisional text',()=>{
 for(const reason of ['cancelled','max_tokens','max_turn_requests','refusal',undefined]) {
  const reply=new GrokFinalText('session');chunk(reply,'UNPUBLISHED');
  const result=reply.finish(reason);expect(result.text).toBe('');expect(result.error).toBeTruthy();
  expect(reply.finish('end_turn')).toEqual({text:''});
 }
 const stopped=new GrokFinalText('session');chunk(stopped,'UNPUBLISHED');stopped.stop();chunk(stopped,'LATE');
 expect(stopped.finish('end_turn')).toEqual({text:''});
});

test('Grok message identity starts a fresh segment without losing chunks before the first ID',()=>{
 const reply=new GrokFinalText('session');chunk(reply,'Interim ');
 update(reply,'agent_message_chunk',{messageId:'first',content:{type:'text',text:'message'}});
 update(reply,'agent_message_chunk',{messageId:'final',content:{type:'text',text:'Final '}});
 update(reply,'agent_message_chunk',{messageId:'final',content:{type:'text',text:'answer'}});
 expect(reply.finish('end_turn')).toEqual({text:'Final answer'});
 const lateId=new GrokFinalText('session');chunk(lateId,'First ');
 update(lateId,'agent_message_chunk',{messageId:'answer',content:{type:'text',text:'and second'}});
 expect(lateId.finish('end_turn')).toEqual({text:'First and second'});
});

test('Grok authoritative message content replaces deltas and accepts later appended chunks',()=>{
 const reply=new GrokFinalText('session');
 update(reply,'agent_message_chunk',{messageId:'answer',content:{type:'text',text:'Incorrect draft'}});
 update(reply,'agent_message',{messageId:'answer',content:[{type:'text',text:'# Correct answer'},{type:'resource',resource:{text:'PRIVATE'}},{type:'text',text:'```js\nconst answer = 42;\n```'}]});
 update(reply,'agent_message',{messageId:'answer'});
 update(reply,'agent_message_chunk',{messageId:'answer',content:{type:'text',text:'\nDone.'}});
 expect(reply.finish('end_turn')).toEqual({text:'# Correct answer\n```js\nconst answer = 42;\n```\nDone.'});
});

test('Grok null or empty replacement content clears a provisional answer',()=>{
 for(const content of [null,[]]) {
  const reply=new GrokFinalText('session');chunk(reply,'Retracted');
  update(reply,'agent_message',{messageId:'answer',content});
  expect(reply.finish('end_turn')).toEqual({text:''});
 }
 const reply=new GrokFinalText('session');chunk(reply,'Interim');
 update(reply,'agent_thought',{messageId:'thought',content:[{type:'text',text:'PRIVATE'}]});
 expect(reply.finish('end_turn')).toEqual({text:''});
});
