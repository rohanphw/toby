import { existsSync, realpathSync, readdirSync } from 'node:fs';
import { mkdir, writeFile, chmod, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Provider, ProviderSetup } from '../shared/contracts';
const exec=promisify(execFile);
const pins={openai:{url:'https://github.com/openai/codex/releases/download/rust-v0.160.1/codex-package-aarch64-apple-darwin.tar.gz',hash:'f73527ee09c6db869acbb37b709866b339ea74ef91d2de255e9c74ec960c6314',archive:true},grok:{url:'https://x.ai/cli/grok-1.0.22-macos-aarch64',hash:'f17b8369d3283bb9ef3daa53bb95f68bfff91d605376eee1769dfbc798f7a9f6',archive:false}};
export function providerEnvironment():NodeJS.ProcessEnv {const env={...process.env};for(const k of ['OPENAI_API_KEY','XAI_API_KEY','ANTHROPIC_API_KEY','ELECTRON_RUN_AS_NODE'])delete env[k];env.PATH=[join(homedir(),'.grok/bin'),join(homedir(),'.bun/bin'),'/opt/homebrew/bin','/usr/local/bin','/usr/bin','/bin',process.env.PATH??''].join(':');return env;}
export function findRuntime(root:string,provider:Provider):string|undefined {const name=provider==='openai'?'codex':'grok';const candidates=[join(root,'runtimes',provider,'bin',name),...providerEnvironment().PATH!.split(':').map(p=>join(p,name))];if(provider==='openai'){const nvm=join(homedir(),'.nvm/versions/node');try{for(const version of readdirSync(nvm))candidates.push(join(nvm,version,'bin/codex'));}catch{}}
 for(const p of candidates)if(existsSync(p)){const actual=realpathSync(p);if(provider==='openai'&&actual.endsWith('.js')){const base=resolveCodexNative(actual);if(base)return base;continue;}return actual;}return undefined;}
export async function prepareRuntime(root:string,provider:Provider,force=false,onProgress?:(state:ProviderSetup)=>void,signal?:AbortSignal){
 if(!force&&findRuntime(root,provider))return;
 if(process.arch!=='arm64')throw Error('This build currently supports Apple Silicon Macs.');
 const pin=pins[provider],dir=join(root,'runtimes',provider),stage=dir+'.staging';
 const downloadSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(300_000)]):AbortSignal.timeout(300_000);
 await mkdir(dir,{recursive:true});
 onProgress?.({phase:'downloading',progress:0,downloadedBytes:0,totalBytes:0});
 const response=await fetch(pin.url,{signal:downloadSignal});
 if(!response.ok||!response.body)throw Error(`Runtime download failed (${response.status})`);
 const totalBytes=Number(response.headers.get('content-length'))||0,parts:Buffer[]=[];
 let downloadedBytes=0,lastProgress=-1;
 const reader=response.body.getReader();
 try{
  while(true){const next=await reader.read();if(next.done)break;downloadSignal.throwIfAborted();
   downloadedBytes+=next.value.length;if(downloadedBytes>400_000_000)throw Error('Runtime download exceeds the supported size');
   parts.push(Buffer.from(next.value));const progress=totalBytes?Math.min(100,Math.floor(downloadedBytes/totalBytes*100)):0;
   if(progress!==lastProgress||!totalBytes){onProgress?.({phase:'downloading',progress,downloadedBytes,totalBytes});lastProgress=progress;}
  }
 }finally{await reader.cancel().catch(()=>{});}
 downloadSignal.throwIfAborted();
 onProgress?.({phase:'verifying',progress:100,downloadedBytes,totalBytes:totalBytes||downloadedBytes});
 const bytes=Buffer.concat(parts);
 if(createHash('sha256').update(bytes).digest('hex')!==pin.hash)throw Error('Runtime checksum verification failed');
 await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
 try{
  if(pin.archive){const file=join(dir,'download.tar.gz');await writeFile(file,bytes);const listing=await exec('/usr/bin/tar',['-tzf',file]);if(listing.stdout.split('\n').some(p=>p.startsWith('/')||p.split('/').includes('..')))throw Error('Unsafe runtime archive');await exec('/usr/bin/tar',['-xzf',file,'-C',stage]);await rm(file);}
  else{await mkdir(join(stage,'bin'));await writeFile(join(stage,'bin/grok'),bytes);await chmod(join(stage,'bin/grok'),0o755);}
  downloadSignal.throwIfAborted();await rm(dir,{recursive:true,force:true});await rename(stage,dir);
 }finally{await rm(stage,{recursive:true,force:true});}
}

function resolveCodexNative(wrapper:string){const root=join(dirname(wrapper),'..');const triple=process.arch==='arm64'?'aarch64-apple-darwin':'x86_64-apple-darwin';const arch=process.arch==='arm64'?'arm64':'x64';for(const candidate of [join(root,'node_modules',`@openai/codex-darwin-${arch}`,'vendor',triple,'bin/codex'),join(root,'vendor',triple,'bin/codex')])if(existsSync(candidate))return realpathSync(candidate);return undefined;}
