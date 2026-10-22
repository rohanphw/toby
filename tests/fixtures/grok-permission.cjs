#!/usr/bin/env node
const readline = require('node:readline');
const net = require('node:net');
let server, serial = 100;
const waiting = new Map();
const send = value => process.stdout.write(JSON.stringify(value) + '\n');
function permission(params) { const id = ++serial; return new Promise(resolve => { waiting.set(id, resolve); send({id,method:'session/request_permission',params}); }); }
function callTool(name, args) {
  const env = Object.fromEntries(server.env.map(entry => [entry.name,entry.value]));
  return new Promise((resolve,reject) => {
    const socket=net.createConnection(env.TOBY_MCP_SOCKET);let data='';
    socket.on('connect',()=>socket.write(JSON.stringify({token:env.TOBY_MCP_TOKEN,method:'tools/call',name,arguments:args})+'\n'));
    socket.on('data',chunk=>data+=chunk);socket.on('end',()=>resolve(JSON.parse(data)));socket.on('error',reject);
  });
}
readline.createInterface({input:process.stdin}).on('line', async line => {
  const message=JSON.parse(line), {id,method,params={}}=message;
  if (!method) { const resolve=waiting.get(id);if(resolve){waiting.delete(id);resolve(message.result);}return; }
  if (id===undefined) return;
  if (method==='initialize'||method==='authenticate'||method==='session/set_model') return send({id,result:{}});
  if (method==='session/new') {server=params.mcpServers.find(server=>server.name==='toby');return send({id,result:{sessionId:'fixture-session',models:{availableModels:[{modelId:'fixture-grok',name:'Fixture Grok'}]}}});}
  if (method==='session/prompt') {
    const prompt=params.prompt[0].text;
    const command=prompt.endsWith('case:command'),native=prompt.endsWith('case:native')||prompt.endsWith('case:cancel'),external=prompt.endsWith('case:external');
    const name=command?'toby_run_command':'toby_list_agents';
    const toolCall={toolCallId:'fixture-call',kind:native?'execute':'other',title:`toby__${name}`,rawInput:native?{variant:'Shell',command:'echo NATIVE_ACTION'}:external?{variant:'UseTool',tool_name:'calendar__delete_event',tool_input:{event_id:'event-123'}}:{variant:'UseTool',tool_name:`toby__${name}`,tool_input:command?{command:'echo MUST_NOT_EXECUTE'}:{}},_meta:{'x.ai/tool':{read_only:native||external}}};
    if(prompt.endsWith('case:opaque'))toolCall.rawInput={variant:'UseTool',tool_name:'calendar__delete_event',tool_input:{event_id:{hidden:'event-123'}}};
    const options=prompt.endsWith('case:no-once')?[{kind:'allow_always',optionId:'always'}]:[{kind:'allow_once',optionId:'allow-specific-once'},{kind:'reject_once',optionId:'deny-specific-once'}];
    const result=await permission({sessionId:prompt.endsWith('case:wrong-session')?'unrelated-session':'fixture-session',toolCall,options});
    let answer=JSON.stringify(result.outcome);
    if(result.outcome.optionId==='allow-specific-once'&&!native&&!external) {
      const tool=await callTool(name,toolCall.rawInput.tool_input);
      answer=tool.error?tool.error:'Checked your team.';
    }
    send({method:'session/update',params:{sessionId:'fixture-session',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:answer}}}});
    return send({id,result:{stopReason:'end_turn'}});
  }
  send({id,result:{}});
});
