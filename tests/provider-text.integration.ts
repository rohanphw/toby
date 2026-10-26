import {app} from 'electron';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,chmod,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Providers} from '../src/main/providers';
import type {Provider} from '../src/shared/contracts';

void app.whenReady().then(async()=>{
 app.dock?.hide();
 const root=await mkdtemp(join(tmpdir(),'toby-provider-text-'));
 const providers=new Providers(root,()=>{});
 const final='## Result\n\n```json\n{"analysis":"requested output"}\n```\n';
 try {
  for(const provider of ['openai','grok'] as const){
   const directory=join(root,'runtimes',provider,'bin');await mkdir(directory,{recursive:true});
   const binary=join(directory,provider==='openai'?'codex':'grok');
   await copyFile(join(process.cwd(),'tests/fixtures/provider-text.cjs'),binary);await chmod(binary,0o755);
  }
  async function run(provider:Provider,scenario:string){
   const output:string[]=[];const controller=new AbortController();let barrierCount=0;
   const barrier=()=>{barrierCount++;assert.deepEqual(output,[],'No provisional text may reach onText');if(scenario==='abort')controller.abort();};
   const result=providers.turn({agent:{id:'test',name:'Toby',personality:'',specialization:'',provider,model:'fixture-model',avatar:'toby',status:'idle',workspace:root,createdAt:Date.now()},
    chatId:'test',prompt:scenario,instructions:'',signal:controller.signal,onText:text=>output.push(text),
    approve:async()=>{barrier();return false;},tools:[{name:'fixture_barrier',description:'Test barrier',inputSchema:{type:'object',properties:{}}}],callTool:async()=>{barrier();return {};},connectors:[]});
   if(scenario==='success'){assert.equal(await result,final);assert.deepEqual(output,[final]);}
   else{await assert.rejects(result);assert.deepEqual(output,[]);}
   assert.equal(barrierCount,1);
  }
  for(const provider of ['openai','grok'] as const)for(const scenario of ['success','failed','abort','disconnect'])await run(provider,scenario);
  await run('openai','error');await run('grok','cancelled');
  console.log('PROVIDER_TEXT_BOUNDARY_PASS: 10 fake-process cases; only terminal final replies reach onText and return values');
 }finally{providers.dispose();await rm(root,{recursive:true,force:true});}
 app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
