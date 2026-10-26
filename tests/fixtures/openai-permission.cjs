#!/usr/bin/env node
const readline=require('node:readline');
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
let settings;
readline.createInterface({input:process.stdin}).on('line',line=>{
 const {id,method,params={}}=JSON.parse(line);if(id===undefined)return;
 if(method==='account/read')return send({id,result:{account:{type:'chatgpt'}}});
 if(method==='thread/start'){settings={approvalPolicy:params.approvalPolicy,sandbox:params.sandbox};return send({id,result:{thread:{id:'thread'}}});}
 if(method==='turn/start'){
  send({method:'item/completed',params:{threadId:'thread',turnId:'turn',item:{id:'answer',type:'agentMessage',phase:'final_answer',text:JSON.stringify(settings)}}});
  send({method:'turn/completed',params:{threadId:'thread',turn:{id:'turn',status:'completed'}}});
  return send({id,result:{turn:{id:'turn'}}});
 }
 send({id,result:{}});
});
