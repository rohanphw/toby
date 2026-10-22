import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
export class Rpc extends EventEmitter {
 readonly process: ChildProcessWithoutNullStreams; private serial=0; private pending=new Map<number,{resolve:(x:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>(); private closed=false;
 onRequest: (method:string,params:any)=>Promise<unknown> = async(method)=>{throw Error(`Unsupported provider request: ${method}`)};
 constructor(command:string,args:string[],options:{cwd?:string;env?:NodeJS.ProcessEnv}={}) {super();this.process=spawn(command,args,{...options,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});const lines=createInterface({input:this.process.stdout});lines.on('line',line=>{try{this.receive(JSON.parse(line));}catch{}});this.process.stderr.on('data',()=>{});this.process.on('error',e=>this.fail(e));this.process.on('exit',(code)=>{this.closed=true;this.fail(Error(`Provider exited (${code??'signal'})`));this.emit('closed');});}
 private receive(message:any){if(message.method){if(message.id!==undefined){void this.onRequest(message.method,message.params??{}).then(result=>this.write({jsonrpc:'2.0',id:message.id,result}),e=>this.write({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:e.message}}));}else this.emit('notification',message.method,message.params??{});return;}const p=this.pending.get(message.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(message.id);if(message.error)p.reject(Error(message.error.message??'Provider request failed'));else p.resolve(message.result??{});}
 private write(value:unknown){if(!this.closed&&this.process.stdin.writable)this.process.stdin.write(JSON.stringify(value)+'\n');}
 request(method:string,params:unknown={},timeout=30_000):Promise<any>{if(this.closed)return Promise.reject(Error('Provider disconnected'));const id=++this.serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(`${method} timed out`));},timeout);this.pending.set(id,{resolve,reject,timer});this.write({jsonrpc:'2.0',id,method,params});});}
 notify(method:string,params:unknown={}){this.write({jsonrpc:'2.0',method,params});}
 private fail(error:Error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 private kill(signal:NodeJS.Signals){try{if(process.platform!=='win32'&&this.process.pid)process.kill(-this.process.pid,signal);else this.process.kill(signal);}catch{}}
 close(){this.closed=true;this.fail(Error('Provider stopped'));this.kill('SIGTERM');const timer=setTimeout(()=>this.kill('SIGKILL'),1500);timer.unref();}
}
