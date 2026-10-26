const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');const path=require('node:path');
const root=process.argv[2],meta=JSON.parse(fs.readFileSync(path.join(root,'scenario.json'),'utf8'));
const db=new DatabaseSync(path.join(root,'app','toby.sqlite'),{readOnly:true});
const all=table=>db.prepare(`SELECT data FROM ${table} ORDER BY rowid`).all().map(r=>JSON.parse(r.data));
const tasks=all('tasks'),messages=all('messages'),memories=all('group_memories');
const report={deliveries:all('group_deliveries'),tasks:tasks.map(t=>({id:t.id,agentId:t.agentId,chatId:t.chatId,parentId:t.parentId,status:t.status,channelParticipation:t.channelParticipation,source:t.source,sourceMessageIds:t.sourceMessageIds,groupRoundId:t.groupRoundId,briefCanary:meta.privateMarkers.some(m=>t.prompt?.includes(m)),resultCanary:meta.privateMarkers.some(m=>t.result?.includes(m))})),
 messages:messages.map(m=>({id:m.id,chatId:m.chatId,senderId:m.senderId,role:m.role,status:m.status,audience:m.audience,correlationId:m.correlationId,canary:meta.privateMarkers.some(c=>m.text?.includes(c)),text:m.audience==='public'&&m.role==='assistant'?m.text:undefined})),
 memories:memories.map(m=>({id:m.id,groupId:m.groupId,authorId:m.authorId,sourceMessageIds:m.sourceMessageIds,text:m.text,canary:meta.privateMarkers.some(c=>m.text?.includes(c))})),
 fts5:db.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS enabled").get().enabled===1};
db.close();process.stdout.write(JSON.stringify(report));
