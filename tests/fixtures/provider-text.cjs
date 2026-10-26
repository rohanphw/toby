#!/usr/bin/env node
// Protocol fixture only: never contacts a provider or executes a model/tool action.
const readline=require('node:readline');
const send=message=>process.stdout.write(JSON.stringify(message)+'\n');
const note=(method,params)=>send({method,params});
const threadId='fixture-thread',turnId='fixture-turn',sessionId='fixture-session';
const final='## Result\n\n```json\n{"analysis":"requested output"}\n```\n';
const item=(id,text,phase,scope={threadId,turnId})=>note('item/completed',{...scope,item:{id,type:'agentMessage',text,phase}});
const chunk=(text,session=sessionId)=>note('session/update',{sessionId:session,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text}}});
const waiting=new Map();let serial=100;
function barrier(method,params) {const id=++serial;return new Promise(resolve=>{waiting.set(id,resolve);send({id,method,params});});}
readline.createInterface({input:process.stdin}).on('line',async line=>{
 const message=JSON.parse(line),{id,method,params={}}=message;
 if(!method){const resolve=waiting.get(id);waiting.delete(id);resolve?.(message.result);return;}
 if(id===undefined)return;
 if(method==='initialize'||method==='authenticate'||method==='session/set_model')return send({id,result:{}});
 if(method==='account/read')return send({id,result:{account:{type:'chatgpt'}}});
 if(method==='thread/start')return send({id,result:{thread:{id:threadId}}});
 if(method==='session/new')return send({id,result:{sessionId,models:{availableModels:[{modelId:'fixture-model',name:'Fixture'}]}}});
 if(method==='turn/start'){
  const scenario=params.input[0].text;
  note('turn/started',{threadId:'foreign',turn:{id:'foreign'}});
  note('item/agentMessage/delta',{threadId,turnId,itemId:'comment',delta:'PRIVATE COMMENTARY'});
  item('comment','PRIVATE COMMENTARY','commentary');
  note('item/completed',{threadId,turnId,item:{id:'thought',type:'reasoning',text:'PRIVATE REASONING'}});
  item('foreign','FOREIGN','final_answer',{threadId:'foreign',turnId});
  item('foreign','FOREIGN','final_answer',{threadId,turnId:'foreign'});
  item('draft','Earlier final','final_answer');
  note('item/agentMessage/delta',{threadId,turnId,itemId:'answer',delta:'Wrong draft'});
  item('answer',final,'final_answer');
  await barrier('item/tool/call',{threadId,turnId,tool:'fixture_barrier',arguments:{}});
  if(scenario==='abort')return;
  if(scenario==='disconnect'){process.exit(0);return;}
  note('turn/completed',{threadId,turn:{id:'foreign',status:'completed'}});
  if(scenario==='error')note('error',{threadId,turnId,willRetry:false,error:{message:'Fixture failed'}});
  else note('turn/completed',{threadId,turn:{id:turnId,status:scenario==='failed'?'failed':'completed'}});
  // Everything, including completion, deliberately arrives before turn/start responds.
  return send({id,result:{turn:{id:turnId}}});
 }
 if(method==='session/prompt'){
  const scenario=params.prompt[0].text.trim();
  chunk('FOREIGN','foreign');chunk('I will check this.');
  note('session/update',{sessionId,update:{sessionUpdate:'tool_call',toolCallId:'tool',rawInput:{secret:'PRIVATE'}}});
  note('session/update',{sessionId,update:{sessionUpdate:'agent_thought_chunk',content:{type:'text',text:'PRIVATE REASONING'}}});
  chunk(final);
  await barrier('session/request_permission',{sessionId,toolCall:{kind:'read',rawInput:{path:'/fixture-only'}},options:[{kind:'allow_once',optionId:'allow'},{kind:'reject_once',optionId:'reject'}]});
  if(scenario==='abort')return;
  if(scenario==='disconnect'){process.exit(0);return;}
  return send({id,result:{stopReason:scenario==='failed'?'max_tokens':scenario==='cancelled'?'cancelled':'end_turn'}});
 }
 send({id,result:{}});
});
