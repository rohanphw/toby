const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(process.argv[2]),prefix=path.resolve('.local')+path.sep;
if(!root.startsWith(prefix)||!fs.existsSync(path.join(root,'scenario.json')))throw Error('Only a scenario-owned isolated .local profile can be pruned');
const ids=JSON.parse(process.argv[3]);if(!Array.isArray(ids)||!ids.every(id=>typeof id==='string'))throw Error('Invalid task IDs');
const db=new DatabaseSync(path.join(root,'app','toby.sqlite'));db.exec('BEGIN IMMEDIATE');
try{let deleted=0;for(const id of ids)deleted+=db.prepare("DELETE FROM messages WHERE json_extract(data,'$.correlationId')=?").run(id).changes;db.exec('COMMIT');console.log(JSON.stringify({deleted,personalMemories:db.prepare('SELECT data FROM memories').all().map(row=>JSON.parse(row.data)).map(m=>({id:m.id,agentId:m.agentId,text:m.text}))}));}catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
