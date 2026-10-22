import { createServer, type Server } from 'node:net';
import { randomBytes } from 'node:crypto';
import { chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export class McpHost {
 private server?:Server; private entries=new Map<string,{tools:any[];call:(name:string,args:any)=>Promise<any>}>();readonly path=join(tmpdir(),`toby-${process.pid}-${randomBytes(6).toString('hex')}.sock`);
 async start(){this.server=createServer(socket=>{let data='';socket.on('data',chunk=>{data+=chunk.toString();if(data.length>2_000_000){socket.destroy();return;}const n=data.indexOf('\n');if(n<0)return;const line=data.slice(0,n);data=data.slice(n+1);void(async()=>{try{const request=JSON.parse(line);const entry=this.entries.get(request.token);if(!entry)throw Error('Expired agent context');const result=request.method==='tools/list'?{tools:entry.tools.map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema}))}:await (async()=>{const value=await entry.call(request.name,request.arguments??{});return {content:value?.image?[{type:'text',text:value.text??'Screen image'},{type:'image',mimeType:value.image.mimeType,data:value.image.data}]:[{type:'text',text:JSON.stringify(value)}]};})();socket.end(JSON.stringify({result})+'\n');}catch(e){socket.end(JSON.stringify({error:e instanceof Error?e.message:String(e)})+'\n');}})();});});await new Promise<void>((resolve,reject)=>{this.server!.once('error',reject);this.server!.listen(this.path,resolve)});await chmod(this.path,0o600);}
 register(tools:any[],call:(name:string,args:any)=>Promise<any>){const token=randomBytes(32).toString('hex');this.entries.set(token,{tools,call});return {server:{name:'toby',command:process.execPath,args:[fileURLToPath(new URL('./mcp-stdio.cjs',import.meta.url))],env:[{name:'ELECTRON_RUN_AS_NODE',value:'1'},{name:'TOBY_MCP_SOCKET',value:this.path},{name:'TOBY_MCP_TOKEN',value:token}]},dispose:()=>this.entries.delete(token)};}
 async dispose(){this.entries.clear();this.server?.close();await rm(this.path,{force:true});}
}
