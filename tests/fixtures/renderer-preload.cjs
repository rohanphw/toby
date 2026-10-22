const {contextBridge}=require('electron');
let state={agents:[],groups:[],messages:[],tasks:[],routines:[],skills:[],memories:[],connectors:[],approvals:[],providers:[{provider:'openai',installed:true,connected:true,models:[{id:'fixture-model',name:'Fixture model'}]},{provider:'grok',installed:true,connected:false,models:[]}],preferences:{onboardingComplete:false,autoCreateAgents:false,maxConcurrency:3,voice:'0'},permissions:{microphone:'not-determined',accessibility:false,screen:'not-determined'},voiceModels:{ready:false,downloading:false,progress:0},dataPath:'isolated functional fixture'};
let resetCalls=0,attachmentCalls=0,releaseAttachment,agentSerial=0,groupSerial=0,messageSerial=0;
const reactionCalls=[],approvalDecisions=[],sendCalls=[],workspaceCalls=[];
const messageListeners=new Set(),listeners=new Set();
const emit=()=>listeners.forEach(fn=>fn(structuredClone(state)));
function save(table,input){const value={...input,id:input.id||`${table}-${state[table].length+1}`};const index=state[table].findIndex(item=>item.id===value.id);if(index<0)state[table].push(value);else state[table][index]=value;emit();return value;}
function remove(table,id){state[table]=state[table].filter(item=>item.id!==id);emit();}
const api={
 snapshot:async()=>structuredClone(state),
 onMessage:fn=>{messageListeners.add(fn);return()=>messageListeners.delete(fn)},
 onChange:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},onSuspend:()=>()=>{},cancelVoice:async()=>{},
 saveAgent:async input=>{const old=state.agents.find(a=>a.id===input.id);const serial=input.id?agentSerial:++agentSerial;return save('agents',{...old,...input,id:input.id||(serial===1?'fixture-toby':`fixture-agent-${serial}`),avatar:input.avatar||old?.avatar||'toby',status:'idle',workspace:'/fixture',createdAt:old?.createdAt||Date.now()});},
 deleteAgent:async id=>remove('agents',id),
 saveGroup:async input=>save('groups',{...input,id:input.id||`fixture-group-${++groupSerial}`,createdAt:Date.now()}),
 setPreferences:async input=>{state.preferences={...state.preferences,...input};emit();},
 send:async(chatId,text,options)=>{sendCalls.push({chatId,text,options});const now=Date.now(),serial=++messageSerial,suffix=serial===1?'':`-${serial}`,group=state.groups.find(group=>group.id===chatId),senderId=group?group.members[0]:chatId;state.messages.push({id:'fixture-user'+suffix,chatId,senderId:'user',role:'user',text,createdAt:now,status:'done',replyTo:options?.replyTo},{id:'fixture-answer'+suffix,chatId,senderId,role:'assistant',text:'Hello, happy to help.',createdAt:now+1,status:'done'});emit();},
 toggleReaction:async(id,emoji)=>{reactionCalls.push({id,emoji});const m=state.messages.find(m=>m.id===id),reactions=m.reactions??[];m.reactions=reactions.includes(emoji)?reactions.filter(value=>value!==emoji):[...reactions,emoji];emit();},
 openAttachment:async()=>{attachmentCalls++;await new Promise(resolve=>{releaseAttachment=resolve;});},
 chooseAttachments:async()=>[{id:'picked-file',name:'brief.md',path:'/fixture/brief.md',bytes:30,agentId:state.agents[0].id}],
 resolveApproval:async(id,allowed)=>{approvalDecisions.push({id,allowed});state.approvals=state.approvals.filter(value=>value.id!==id);emit();},
 resetApp:async()=>{resetCalls++;return false;},
 refreshProviders:async()=>emit(),prepareProvider:async()=>{},
 connectProvider:async provider=>{const value=state.providers.find(p=>p.provider===provider);value.connected=true;value.models=[{id:provider==='grok'?'fixture-grok':'fixture-model',name:provider==='grok'?'Fixture Grok':'Fixture model'}];emit();},
 stop:async()=>{},resumeTask:async()=>{},
 requestPermission:async()=>state.permissions,openPermissionSettings:async()=>{},
 setAgentVisibility:async(id,options)=>{const agent=state.agents.find(a=>a.id===id);Object.assign(agent,options);emit();},
 openWorkspace:async id=>{workspaceCalls.push(id||'all');},chooseWorkspace:async()=>{},
 listFiles:async()=>[{name:'report.md',directory:false,path:'report.md'}],readFile:async()=> 'A local report.',
 saveMemory:async input=>save('memories',input),deleteMemory:async id=>remove('memories',id),
 saveSkill:async input=>save('skills',input),deleteSkill:async id=>remove('skills',id),
 saveRoutine:async input=>save('routines',{...input,nextRun:Date.now()+60000}),deleteRoutine:async id=>remove('routines',id),
 saveConnector:async input=>save('connectors',input),deleteConnector:async id=>remove('connectors',id),
 openBrowser:async()=>{},openExternal:async()=>{}
};
contextBridge.exposeInMainWorld('toby',api);
contextBridge.exposeInMainWorld('fixture',{
 reactionCalls:()=>structuredClone(reactionCalls),sendCalls:()=>structuredClone(sendCalls),workspaceCalls:()=>structuredClone(workspaceCalls),
 attachmentCalls:()=>attachmentCalls,releaseAttachment:()=>releaseAttachment?.(),
 approval:value=>{state.approvals=[value];emit();},approvalDecisions:()=>structuredClone(approvalDecisions),resetCalls:()=>resetCalls,
 message:message=>{const index=state.messages.findIndex(m=>m.id===message.id);if(index<0)state.messages.push(message);else state.messages[index]=message;messageListeners.forEach(fn=>fn(structuredClone(message)));},
 task:value=>{state.tasks=[value];emit();},setup:value=>{state.providers[0].setup=value;emit();},refresh:()=>emit()
});
