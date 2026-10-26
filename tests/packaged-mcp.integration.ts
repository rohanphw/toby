import {app} from 'electron';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {McpHost} from '../src/main/mcp-host';
import {Rpc} from '../src/main/rpc';
import {providerEnvironment} from '../src/main/runtime';
void app.whenReady().then(async()=>{app.dock?.hide();const host=new McpHost();await host.start();let calls=0;const context=host.register([{name:'toby_ping',description:'Test local transport',inputSchema:{type:'object',properties:{}}}],async()=>{calls++;return {ok:true};});const env={...providerEnvironment(),...Object.fromEntries(context.server.env.map(v=>[v.name,v.value]))};const rpc=new Rpc(resolve('dist/mac-arm64/Toby.app/Contents/MacOS/Toby'),[resolve('dist/mac-arm64/Toby.app/Contents/Resources/app.asar/out/main/mcp-stdio.cjs')],{env});try{await rpc.request('initialize',{protocolVersion:'2024-11-05'});const tools=await rpc.request('tools/list');assert.equal(tools.tools[0].name,'toby_ping');const result=await rpc.request('tools/call',{name:'toby_ping',arguments:{}});assert(JSON.parse(result.content[0].text).ok);assert.equal(calls,1);console.log('PACKAGED_MCP_PASS: signed app executable in Node mode loaded the packaged ASAR bridge and completed a task-bound local tool call');}finally{rpc.close();context.dispose();await host.dispose();}app.exit(0);}).catch(e=>{console.error(e.message);app.exit(1)});
