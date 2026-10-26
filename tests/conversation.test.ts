import { expect, test } from 'bun:test';
import type { Message, Snapshot, Task } from '../src/shared/contracts';
import { conversationRows, publicMessage, publicSnapshot } from '../src/shared/conversation';

const task: Task = { id:'root', chatId:'team', agentId:'lead', prompt:'User request', status:'done', createdAt:1 };
const child: Task = { ...task, id:'child', agentId:'worker', parentId:task.id, prompt:'PRIVATE_BRIEF', displayPrompt:'PRIVATE_BRIEF', result:'PRIVATE_RESULT' };
const message = (input: Partial<Message>): Message => ({ id:'answer', chatId:'team', senderId:'lead', role:'assistant', text:'Final answer', status:'done', createdAt:2, ...input });
const snapshot = (messages:Message[], tasks:Task[] = [task,child]) => ({
  agents:[], groups:[], messages, tasks, routines:[], skills:[], memories:[], connectors:[], approvals:[], providers:[],
  preferences:{onboardingComplete:true,autoCreateAgents:false,maxConcurrency:3,voice:'0'},
  permissions:{microphone:'not-determined',accessibility:false,screen:'not-determined'},
  voiceModels:{ready:false,downloading:false,progress:0},dataPath:'/isolated',
} satisfies Snapshot);

test('private execution and legacy delegation never enter public snapshots or live-message projection', () => {
  const records = [
    message({id:'private',audience:'internal',text:'PRIVATE_THOUGHT'}),
    message({id:'legacy-worker',senderId:'worker',correlationId:'child',text:'PRIVATE_RESULT'}),
    message({id:'legacy-brief',role:'system',correlationId:'child',text:'PRIVATE_BRIEF'}),
    message({id:'legacy-ack',correlationId:'root',text:'PRIVATE_PLAN'}),
    message({id:'final',audience:'public',correlationId:'root',text:'## Result\n\n```json\n{"answer":42}\n```'}),
  ];
  const result = publicSnapshot(snapshot(records));
  expect(result.messages.map(m=>m.id)).toEqual(['final']);
  expect(records.filter(m=>publicMessage(m,[task,child])).map(m=>m.id)).toEqual(['final']);
  expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  expect(result.messages[0].text).toBe(records[4].text);
  expect(result.tasks[1].displayPrompt).toBe('Helping a teammate');
  expect(publicSnapshot(result)).toEqual(result);
});

test('raw activity payloads and approval diagnostics stay out of public IPC', () => {
  const state = snapshot([message({role:'tool',text:'list agents\n{"PRIVATE_PAYLOAD":true}'})]);
  state.approvals.push({id:'approval',agentId:'lead',title:'Run a command?',detail:'Check the workspace',technicalDetails:'PRIVATE_PROTOCOL'});
  const result = publicSnapshot(state);
  expect(result.messages[0].text).toBe('Checked your team');
  expect(result.approvals[0].detail).toBe('Check the workspace');
  expect(JSON.stringify(result)).not.toContain('PRIVATE_');
});

test('public audience tags cannot publish child replies or briefs', () => {
  const records = [
    message({id:'worker',senderId:'worker',correlationId:'child',audience:'public',text:'PRIVATE_RESULT'}),
    message({id:'brief',role:'system',correlationId:'child',audience:'public',text:'PRIVATE_BRIEF'}),
    message({id:'owner',correlationId:'root',audience:'public',text:'Shared outcome'}),
  ];
  expect(records.filter(record=>publicMessage(record,[task,child])).map(record=>record.id)).toEqual(['owner']);
  const result = publicSnapshot(snapshot(records));
  expect(result.messages.map(record=>record.id)).toEqual(['owner']);
  expect(JSON.stringify(result)).not.toContain('PRIVATE_');
});

test('child tool records and attachments stay private while root activities remain visible', () => {
  const attachments = [{id:'attachment',name:'PRIVATE_ATTACHMENT',path:'/isolated/PRIVATE_WORKER_FILE',bytes:1,agentId:'worker'}];
  const records = [
    message({id:'worker-tool',role:'tool',senderId:'worker',correlationId:'child',audience:'public',text:'PRIVATE_TOOL',activity:{title:'PRIVATE_ACTIVITY'},attachments}),
    message({id:'legacy-worker-tool',role:'tool',senderId:'worker',correlationId:'child',text:'PRIVATE_LEGACY_TOOL',attachments}),
    message({id:'owner-tool',role:'tool',correlationId:'root',text:'read file'}),
    message({id:'owner',correlationId:'root',audience:'public',text:'Shared outcome'}),
  ];
  expect(records.filter(record=>publicMessage(record,[task,child])).map(record=>record.id)).toEqual(['owner-tool','owner']);
  const result = publicSnapshot(snapshot(records));
  expect(result.messages.map(record=>record.id)).toEqual(['owner-tool','owner']);
  expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  expect(conversationRows(result.messages).map(row=>row.kind)).toEqual(['activity','message']);
});

test('channel participation hides decision instructions while preserving each explicit public post', () => {
  const participation: Task = {...task,channelParticipation:true,prompt:'PRIVATE_DECISION_INSTRUCTIONS',displayPrompt:'PRIVATE_DECISION_SUMMARY',result:'PRIVATE_NATIVE_RESULT'};
  const peer: Task = {...participation,id:'peer-turn',agentId:'peer'};
  const records = [
    message({id:'native',correlationId:participation.id,audience:'internal',text:'PRIVATE_NATIVE_RESULT'}),
    message({id:'decision-tool',role:'tool',correlationId:participation.id,audience:'internal',text:'PRIVATE_DECISION_TOOL'}),
    message({id:'unmarked-native',correlationId:participation.id,text:'PRIVATE_UNMARKED_NATIVE'}),
    message({id:'public-stream',correlationId:participation.id,audience:'public',status:'streaming',text:'PRIVATE_PROVISIONAL_NATIVE'}),
    message({id:'public-failure',correlationId:participation.id,audience:'public',status:'failed',text:'PRIVATE_FAILED_NATIVE'}),
    message({id:'public-tool',role:'tool',correlationId:participation.id,audience:'public',text:'PRIVATE_TOOL',activity:{title:'PRIVATE_ACTIVITY'},attachments:[{id:'private-file',name:'PRIVATE_ATTACHMENT',path:'/isolated/PRIVATE_FILE',bytes:1,agentId:participation.agentId}]}),
    message({id:'public-system',role:'system',correlationId:participation.id,audience:'public',text:'PRIVATE_SYSTEM'}),
    message({id:'public-post',correlationId:participation.id,audience:'public',text:'First participant reply'}),
    message({id:'peer-post',senderId:'peer',correlationId:peer.id,audience:'public',text:'Another participant reply'}),
  ];
  expect(records.filter(record=>publicMessage(record,[participation,peer])).map(record=>record.id)).toEqual(['public-post','peer-post']);
  const result = publicSnapshot(snapshot(records,[participation,peer]));
  expect(result.messages.map(record=>record.id)).toEqual(['public-post','peer-post']);
  expect(result.tasks.map(record=>record.displayPrompt)).toEqual(['Participating in the conversation','Participating in the conversation']);
  expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  expect(publicSnapshot(result)).toEqual(result);
});

test('activities precede the final response and group without changing message identities', () => {
  const final = message({id:'final',audience:'public',correlationId:'root',createdAt:5});
  const first = message({id:'read',role:'tool',correlationId:'root',createdAt:4,text:'read file'});
  const second = message({id:'write',role:'tool',correlationId:'root',createdAt:5,text:'write file'});
  const result = publicSnapshot(snapshot([final,first,second],[task]));
  expect(result.messages.map(m=>m.id)).toEqual(['read','write','final']);
  const rows = conversationRows(result.messages);
  expect(rows.map(row=>[row.id,row.kind])).toEqual([['read','activity'],['final','message']]);
  if (rows[0].kind==='activity') expect(rows[0].messages.map(m=>m.id)).toEqual(['read','write']);
  expect(conversationRows([message({audience:'internal'})])).toEqual([]);
});

test('equal timestamps across concurrent tasks use a consistent activity-before-answer order', () => {
  const final = message({id:'final',audience:'public',correlationId:'root',createdAt:5});
  const foreign = message({id:'foreign',role:'tool',correlationId:'other',createdAt:5,text:'read file'});
  const own = message({id:'own',role:'tool',correlationId:'root',createdAt:5,text:'write file'});
  const result = publicSnapshot(snapshot([final,foreign,own],[task]));
  expect(result.messages.map(message=>message.id)).toEqual(['foreign','own','final']);
});
