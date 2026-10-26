type Reply = { text: string; error?: string };
type Message = { text: string; phase?: string; completed: boolean; boundary: number };
type Event = { method: string; params: any };

// onText is append-only. Buffer even explicitly final messages so a later item,
// authoritative completion, failure, or cancellation cannot leave provisional text visible.
export class CodexFinalText {
 private turnId = '';
 private pending: Event[] = [];
 private messages = new Map<string, Message>();
 private workItems = new Set<string>();
 private boundary = 0;
 private phased = false;
 private closed = false;
 constructor(private readonly threadId: string) {}

 bindTurn(turnId: string): Reply | undefined {
  if (this.closed || !turnId || this.turnId) return;
  this.turnId = turnId;
  const pending = this.pending;this.pending = [];
  for (const event of pending) {
   const result = this.accept(event.method, event.params);
   if (result) return result;
  }
 }

 accept(method: string, params: any): Reply | undefined {
  if (this.closed || params?.threadId !== this.threadId) return;
  if (!['item/started','item/completed','item/agentMessage/delta','turn/completed','error'].includes(method)) return;
  if (!this.turnId) {
   // turn/start can emit notifications before its response. Keep only the fields
   // this boundary needs; tool payloads and reasoning text never enter the buffer.
   const item = params.item;
   this.pending.push({method,params:{threadId:params.threadId,turnId:params.turnId,itemId:params.itemId,delta:params.delta,
    item:item?{id:item.id,type:item.type,...(item.type==='agentMessage'?{text:item.text,phase:item.phase}:{})}:undefined,
    turn:params.turn?{id:params.turn.id,status:params.turn.status,error:params.turn.error}:undefined,
    error:params.error,willRetry:params.willRetry}});
   return;
  }
  const eventTurnId = method==='turn/completed'?params.turn?.id:params.turnId;
  if (eventTurnId !== this.turnId) return;
  if (method==='error') {
   if (!params.willRetry) return this.finish(typeof params.error?.message==='string'?params.error.message:'Provider could not complete the reply.');
   return;
  }
  if (method==='turn/completed') {
   if (params.turn.status==='completed') return this.finish();
   return this.finish(params.turn.status==='interrupted'?'Interrupted':typeof params.turn.error?.message==='string'?params.turn.error.message:'Provider could not complete the reply.');
  }
  if (method==='item/agentMessage/delta') {
   if (typeof params.itemId!=='string' || !params.itemId || typeof params.delta!=='string') return;
   const message = this.messages.get(params.itemId) ?? {text:'',completed:false,boundary:this.boundary};
   if (!message.completed) message.text += params.delta;
   this.messages.set(params.itemId,message);
   return;
  }
  const item = params.item;
  if (!item || typeof item.id!=='string' || !item.id) return;
  if (item.type!=='agentMessage') {
   // An unphased message before another work/reasoning item is not a final reply.
   if (!this.workItems.has(item.id)) {this.workItems.add(item.id);this.boundary++;}
   return;
  }
  const message = this.messages.get(item.id) ?? {text:'',completed:false,boundary:this.boundary};
  if (typeof item.phase==='string') {message.phase=item.phase;this.phased=true;}
  if (method==='item/completed') {
   if (typeof item.text==='string') message.text=item.text;
   message.completed=true;
  }
  this.messages.set(item.id,message);
 }

 private finish(error?: string): Reply {
  const messages = [...this.messages.values()];
  const final = messages.findLast(message=>message.phase==='final_answer');
  // Older Codex versions omit phase. Only the last completed message after the
  // last work boundary is eligible, and only when the entire turn is unphased.
  const legacy = !this.phased?messages.findLast(message=>message.completed&&message.boundary===this.boundary):undefined;
  const text = error?'':(final??legacy)?.text??'';
  this.stop();
  return error?{text,error}:{text};
 }

 stop() {this.closed=true;this.messages.clear();this.workItems.clear();this.pending=[];}
}

// ACP has no final/commentary phase. The last assistant segment after work/thought
// boundaries, committed by session/prompt end_turn, is the available final signal.
// Unmarked narration inside that segment cannot be distinguished from an answer;
// do not guess by deleting prose, Markdown, code, or JSON from the user's deliverable.
export class GrokFinalText {
 private text = '';
 private messageId?: string;
 private closed = false;
 private tools = new Set<string>();
 constructor(private readonly sessionId: string) {}

 accept(method: string, params: any) {
  if (this.closed || method!=='session/update' || params?.sessionId!==this.sessionId) return;
  const update = params.update;
  if (!update) return;
  if (update.sessionUpdate==='agent_thought_chunk' || (update.sessionUpdate==='agent_thought' && update.content!==undefined)) {
   this.resetMessage(); // A new reasoning step makes preceding prose interim; never retain thought content.
  } else if (update.sessionUpdate==='tool_call' || update.sessionUpdate==='tool_call_update') {
   const id = typeof update.toolCallId==='string'?update.toolCallId:'';
   // Some agents first announce a call through an update. Repeated status/output
   // updates for a known call must not erase a reply arriving before a late update.
   if (update.sessionUpdate==='tool_call' || !id || !this.tools.has(id)) this.resetMessage();
   if (id) this.tools.add(id);
  } else if (update.sessionUpdate==='agent_message_chunk' && update.content?.type==='text' && typeof update.content.text==='string') {
   this.selectMessage(update.messageId);
   this.text+=update.content.text;
  } else if (update.sessionUpdate==='agent_message' && (update.content===null || Array.isArray(update.content))) {
   this.selectMessage(update.messageId);
   this.text=(update.content??[]).filter((content:any)=>content?.type==='text'&&typeof content.text==='string').map((content:any)=>content.text).join('\n');
  }
 }

 private selectMessage(id: unknown) {
  if (typeof id!=='string' || !id) return;
  if (this.messageId && this.messageId!==id) this.text='';
  this.messageId=id;
 }

 private resetMessage() {this.text='';this.messageId=undefined;}

 finish(stopReason: unknown): Reply {
  const text = !this.closed&&stopReason==='end_turn'?this.text:'';
  this.stop();
  if (stopReason!=='end_turn') return {text:'',error:stopReason==='cancelled'?'Interrupted':'Grok stopped before completing the reply. Please try again.'};
  return {text};
 }

 stop() {this.closed=true;this.resetMessage();this.tools.clear();}
}
