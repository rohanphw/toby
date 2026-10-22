import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness, TOOLS } from '../src/main/harness';
import { describeActivity } from '../src/shared/activity';
import type { Message, Task } from '../src/shared/contracts';

void app.whenReady().then(async()=>{
  app.dock?.hide();const root=await mkdtemp(join(tmpdir(),'toby-tool-presentation-')),store=new Store(root);
  const provider:any={states:[{provider:'openai',connected:true,models:[{id:'fixture'}]}],turn:async(o:any)=>{
    const team=await o.callTool('toby_list_agents',{});assert.equal(team[0].name,'Toby');
    const file=await o.callTool('toby_write_file',{path:'report.json',text:'{"PRIVATE_RESULT":"do not render this payload"}'});assert(file.attachment.id);
    assert.match(await o.callTool('toby_read_file',{path:'report.json'}),/PRIVATE_RESULT/);
    assert.equal((await o.callTool('toby_list_files',{}))[0].name,'report.json');
    await o.callTool('toby_remember',{text:'Private internal memory'});
    await o.callTool('toby_learn_skill',{name:'Review reports',instructions:'Private internal instructions'});
    assert.equal((await o.callTool('toby_browser_read',{})).title,'Fixture page');
    await assert.rejects(()=>o.callTool('toby_read_file',{path:'missing.txt'}),/ENOENT/);
    return 'The report is ready.';
  }};
  const harness=new Harness(store,provider,{register:()=>({server:{},dispose(){}})} as any,{read:async()=>({title:'Fixture page',url:'https://example.com',text:'PRIVATE_BROWSER_RESULT',elements:[]}),close(){}} as any,'/unused',()=>{});
  try{
    for(const tool of TOOLS)for(const status of ['streaming','done','failed'] as const){
      const summary=describeActivity(tool.name,{},status);assert(!/connected|toby_|__/.test(summary.title),`Missing human label for ${tool.name}`);
    }
    const agent=harness.saveAgent({name:'Toby',provider:'openai',model:'fixture',personality:'',specialization:''});
    await harness.send(agent.id,'Prepare a report');
    const deadline=Date.now()+5000;while(Date.now()<deadline&&!store.all<Task>('tasks').some(task=>task.status==='done'))await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(store.all<Task>('tasks')[0].status,'done');assert.equal(store.all<Task>('tasks')[0].displayPrompt,'Prepare a report');
    const activity=store.all<Message>('messages').filter(message=>message.role==='tool');assert.equal(activity.length,8);
    for(const message of activity){assert(message.activity?.title);assert(!/PRIVATE_|toby_|rawInput|provider|\{"/.test(message.text+' '+message.activity.detail));}
    const file=activity.find(message=>message.text==='Wrote a file');assert(file?.attachments?.[0].id,'Saved file remains accessible');
    assert.match(activity.find(message=>message.status==='failed')!.activity!.detail!,/could not be found/);
    console.log(`TOOL_PRESENTATION_PASS: all ${TOOLS.length} built-ins have labels for running/success/failure; array, object, file, browser and failure results remain usable by agents without raw transcript payloads`);
  }finally{await harness.shutdown();store.close();await rm(root,{recursive:true,force:true});}
  app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
