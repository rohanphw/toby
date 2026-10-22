import { app, BrowserWindow, ipcMain, dialog, shell, Menu, powerMonitor, session } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { copyFile, stat, mkdir } from 'node:fs/promises';
import { basename } from 'node:path';
import { Store } from './store';
import { Providers } from './providers';
import { Harness } from './harness';
import { VoiceService } from './voice';
import { requestReset, completePendingReset } from './reset';
import { reservedConnectorName } from './approvals';
import { publicError } from '../shared/errors';
import { getPermissions, requestPermission, openPermissionSettings } from './permissions';
import { McpHost } from './mcp-host';
import { LocalBrowser, webURL } from './browser';
import type { Snapshot, Agent, Memory, Skill, Routine, Connector, Preferences, Provider, Attachment, Group, Message, Task } from '../shared/contracts';
const here=dirname(fileURLToPath(import.meta.url));
const smoke=process.argv.includes('--smoke-test');
app.setName('Toby');
app.setPath('userData',process.env.TOBY_DATA_DIR??join(app.getPath('appData'),app.isPackaged?'Toby Next':'Toby Next Development'));
if(!app.requestSingleInstanceLock()){app.quit();}else{void boot();}
async function boot(){await app.whenReady();let window:BrowserWindow|undefined;let quit=false;let resetting=false;let timer:ReturnType<typeof setTimeout>|undefined;
 let resetCompleted=false;
 try{resetCompleted=await completePendingReset(app.getPath('userData'),async()=>{
  for(const current of [session.defaultSession,session.fromPartition('persist:toby-browser')]){
   await current.closeAllConnections();await current.clearStorageData();await current.clearCache();await current.clearCodeCaches({});await current.clearAuthCache();
  }
 });}catch(error){dialog.showErrorBox('Could not reset Toby',`Your reset will be retried when Toby next opens.\n\n${publicError(error,'Local data could not be cleared. Check access to Toby’s data folder and try again.')}`);app.exit(1);return;}
 const store=new Store(app.getPath('userData'));
 const changed=()=>{if(quit||timer)return;timer=setTimeout(()=>{timer=undefined;if(window&&!window.isDestroyed())window.webContents.send('toby:changed',snapshot());},30);};
 const providers=new Providers(store.root,changed);const voice=new VoiceService(store.root,changed);const mcp=new McpHost();await mcp.start();const browser=new LocalBrowser();const helper=app.isPackaged?join(process.resourcesPath,'assets/computer-helper'):join(app.getAppPath(),'resources/computer-helper');const harness=new Harness(store,providers,mcp,browser,helper,changed,message=>{if(window&&!window.isDestroyed())window.webContents.send('toby:message',message);});
 function snapshot():Snapshot{return {agents:store.all('agents'),groups:store.all('groups'),messages:store.all<Message>('messages').map(message=>harness.streamingMessages.get(message.id)??message),tasks:store.all('tasks'),routines:store.all('routines'),skills:store.all('skills'),memories:store.all('memories'),connectors:store.all('connectors'),approvals:harness.pendingApprovals,providers:structuredClone(providers.states),preferences:store.preferences,permissions:getPermissions(),voiceModels:voice.state,dataPath:store.root};}
 const text=(v:unknown,max=100000)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid text');return v;};const record=(v:unknown):any=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid request');return v;};const provider=(v:unknown):Provider=>{if(v!=='openai'&&v!=='grok')throw Error('Unsupported provider');return v;};const permission=(v:unknown)=>{if(v!=='microphone'&&v!=='accessibility'&&v!=='screen')throw Error('Unknown permission');return v;};const id=(v:unknown)=>text(v,100);const agent=(v:unknown)=>{const a=store.get<Agent>('agents',id(v));if(!a)throw Error('Unknown agent');return a;};
 const handlers:Record<string,(...args:any[])=>unknown>={
 snapshot,
 resetApp:async()=>{
  resetting=true;
  try{
   const confirmation=await dialog.showMessageBox(window!,{type:'warning',title:'Reset Toby',message:'Reset Toby and delete local data?',detail:'This permanently deletes chats, agents, groups, memories, skills, routines, connectors, settings, browser sessions and files in Toby-managed workspaces. Toby will restart at onboarding.\n\nShared ChatGPT/Grok sign-ins, macOS permissions and folders outside Toby storage are kept. This cannot be undone.',buttons:['Cancel','Reset Toby'],defaultId:0,cancelId:0,noLink:true});
   if(confirmation.response!==1)return false;
   await requestReset(store.root);
   quit=true;clearTimeout(timer);
   await Promise.all([harness.shutdown(),providers.shutdown()]);
   app.relaunch();app.quit();return true;
  }finally{if(!quit)resetting=false;}
 },
 setAgentVisibility:(v,options)=>{const a=agent(v),p=record(options);for(const key of ['pinned','hidden'])if(p[key]!==undefined&&typeof p[key]!=='boolean')throw Error('Invalid visibility');if(p.hidden&&store.all<Task>('tasks').some(t=>t.agentId===a.id&&['queued','running'].includes(t.status)))throw Error('Stop this agent before hiding it');store.put('agents',{...a,pinned:p.pinned??a.pinned,hidden:p.hidden??a.hidden});changed();},
 chooseAttachments:async v=>{const chat=id(v);const group=store.get<Group>('groups',chat);const a=agent(group?group.members[0]:chat);const selected=await dialog.showOpenDialog(window!,{title:'Attach files to your message',properties:['openFile','multiSelections']});if(selected.canceled)return [];if(selected.filePaths.length>20)throw Error('Attach up to 20 files at once');const result:Attachment[]=[];for(const file of selected.filePaths){const info=await stat(file);if(!info.isFile()||info.size>100_000_000)throw Error('Attachments must be files up to 100 MB');const attachmentId=randomUUID();const directory=join(a.workspace,'attachments',attachmentId);await mkdir(directory,{recursive:true});const path=join(directory,basename(file));await copyFile(file,path);const attachment={id:attachmentId,name:basename(file),path,bytes:info.size,agentId:a.id,chatId:chat};store.put('attachments',attachment);result.push(attachment);}return result;},
 openAttachment:async v=>{const a=store.get<Attachment>('attachments',id(v));if(!a)throw Error('Attachment is no longer available');const path=await harness.path(a.agentId,a.path);const error=await shell.openPath(path);if(error)throw Error(error);},
 toggleReaction:(v,emoji)=>{const message=store.get<Message>('messages',id(v));const reaction=text(emoji,12);if(!message||!['👍','❤️','🎉','👀','✅'].includes(reaction))throw Error('Invalid message reaction');const current=message.reactions??[];store.put('messages',{...message,reactions:current.includes(reaction)?current.filter(r=>r!==reaction):[...current,reaction]});changed();},
 saveAgent:(v)=>{const p=record(v);return harness.saveAgent({id:p.id===undefined?undefined:id(p.id),name:text(p.name,100),personality:text(p.personality,12000),specialization:text(p.specialization,12000),provider:provider(p.provider),model:text(p.model,200),avatar:p.avatar===undefined?undefined:text(p.avatar,100)});},
 deleteAgent:v=>harness.deleteAgent(id(v)),
 saveGroup:v=>{const p=record(v);if(!Array.isArray(p.members)||p.members.length>10000)throw Error('Invalid group members');return harness.saveGroup({id:p.id===undefined?undefined:id(p.id),name:text(p.name,100),instructions:text(p.instructions,12000),members:p.members.map(id)});},
 send:(chat,message,options)=>{const o=options===undefined?{}:record(options);if(o.attachments!==undefined&&(!Array.isArray(o.attachments)||o.attachments.length>20))throw Error('Attach up to 20 files per message');if(o.voice!==undefined&&typeof o.voice!=='boolean')throw Error('Invalid voice request');return harness.send(id(chat),text(message),{voice:o.voice,replyTo:o.replyTo===undefined?undefined:id(o.replyTo),attachments:o.attachments?.map(id)});},stop:chat=>harness.stop(id(chat)),resumeTask:(task,owner)=>harness.resumeTask(id(task),owner===undefined?undefined:id(owner)),
 setPreferences:v=>{const p=record(v);const next:Partial<Preferences>={};for(const key of ['onboardingComplete','autoCreateAgents'] as const)if(p[key]!==undefined){if(typeof p[key]!=='boolean')throw Error('Invalid preference');next[key]=p[key];}if(p.onboardingComplete===true&&store.all<Agent>('agents').length===0)throw Error('Set up Toby first');if(p.maxConcurrency!==undefined){if(!Number.isInteger(p.maxConcurrency)||p.maxConcurrency<1||p.maxConcurrency>8)throw Error('Choose 1–8 simultaneous tasks');next.maxConcurrency=p.maxConcurrency;}if(p.voice!==undefined)next.voice=text(p.voice,30);store.setPreferences(next);changed();void harness.drain();},
 connectProvider:v=>providers.connect(provider(v)),refreshProviders:()=>providers.refresh(),prepareProvider:v=>providers.prepare(provider(v)),
 requestPermission:async v=>{const result=await requestPermission(permission(v));changed();return result;},openPermissionSettings:v=>openPermissionSettings(permission(v)),
 transcribe:v=>voice.transcribe(record(v)),cancelVoice:()=>voice.cancel(),
 saveMemory:v=>{const p=record(v);agent(p.agentId);const m:Memory={id:p.id===undefined?randomUUID():id(p.id),agentId:id(p.agentId),text:text(p.text,16000)};if(!m.text.trim())throw Error('Enter a memory');store.put('memories',m);changed();},deleteMemory:v=>{store.remove('memories',id(v));changed();},
 saveSkill:v=>{const p=record(v);const s:Skill={id:p.id===undefined?randomUUID():id(p.id),name:text(p.name,100),instructions:text(p.instructions,30000)};if(!s.name.trim()||!s.instructions.trim())throw Error('Enter a name and instructions');store.put('skills',s);changed();},deleteSkill:v=>{store.remove('skills',id(v));changed();},
 saveRoutine:v=>{const p=record(v);agent(p.agentId);if(!Number.isInteger(p.intervalMinutes)||p.intervalMinutes<1||p.intervalMinutes>525600||typeof p.enabled!=='boolean')throw Error('Invalid routine interval or state');const r:Routine={id:p.id===undefined?randomUUID():id(p.id),agentId:id(p.agentId),name:text(p.name,100),prompt:text(p.prompt,30000),enabled:p.enabled,intervalMinutes:p.intervalMinutes,nextRun:Date.now()+p.intervalMinutes*60000};if(!r.name.trim()||!r.prompt.trim())throw Error('Enter a name and task');store.put('routines',r);changed();},deleteRoutine:v=>{store.remove('routines',id(v));changed();},
 saveConnector:v=>{const p=record(v);if(!Array.isArray(p.args)||typeof p.enabled!=='boolean')throw Error('Invalid connector');const c:Connector={id:p.id===undefined?randomUUID():id(p.id),name:text(p.name,100),command:text(p.command,4000),args:p.args.map((a:unknown)=>text(a,4000)),enabled:p.enabled};if(!c.name.trim()||!c.command.trim())throw Error('Enter a name and executable path');if(reservedConnectorName(c.name))throw Error('Choose a connector name other than Toby or a Toby-prefixed internal name.');if(!c.command.startsWith('/'))throw Error('Use an absolute executable path for the MCP server');store.put('connectors',c);changed();},deleteConnector:v=>{store.remove('connectors',id(v));changed();},resolveApproval:(v,yes)=>{if(typeof yes!=='boolean')throw Error('Invalid decision');harness.resolveApproval(id(v),yes);},
 openWorkspace:v=>shell.openPath(v===undefined?store.root:agent(v).workspace).then(e=>{if(e)throw Error(e)}),
 chooseWorkspace:async v=>{const a=agent(v);if(a.status!=='idle')throw Error('Stop this agent before changing workspace');const result=await dialog.showOpenDialog(window!,{properties:['openDirectory','createDirectory'],title:`Choose workspace for ${a.name}`});if(!result.canceled){store.put('agents',{...a,workspace:result.filePaths[0]});changed();}},
 openExternal:v=>shell.openExternal(webURL(text(v,8000))),openBrowser:v=>browser.open(text(v,8000)).then(()=>{}),listFiles:(a,p)=>harness.listFiles(id(a),p===undefined?'.':text(p,4000)),readFile:(a,p)=>harness.readFile(id(a),text(p,4000))
 };
 ipcMain.handle('toby:invoke',async(event,method:unknown,args:unknown)=>{if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw Error('Untrusted IPC sender');if(resetting)throw Error('Toby is resetting. Please wait.');if(typeof method!=='string'||!Object.hasOwn(handlers,method)||!Array.isArray(args)||args.length>4)throw Error('Invalid IPC request');try{return await handlers[method](...args);}catch(error){throw Error(publicError(error));}});
 function createWindow(){window=new BrowserWindow({width:1400,height:900,minWidth:960,minHeight:640,show:!smoke,title:'Toby',titleBarStyle:'hiddenInset',trafficLightPosition:{x:20,y:20},backgroundColor:'#080808',webPreferences:{preload:join(here,'../preload/index.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
 if(resetCompleted)window.webContents.once('did-finish-load',()=>window?.webContents.setZoomLevel(0));
 const trustedURL=process.env.ELECTRON_RENDERER_URL;
 window.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))void shell.openExternal(url);return {action:'deny'};});window.webContents.on('will-navigate',(event,url)=>{if(url!==window!.webContents.getURL())event.preventDefault();});
 window.webContents.session.setPermissionCheckHandler((wc,p,_origin,details)=>wc===window?.webContents&&details.isMainFrame&&p==='media'&&details.mediaType!=='video'&&(!details.requestingUrl||details.requestingUrl===wc.getURL())&&getPermissions().microphone==='granted');
 window.webContents.session.setPermissionRequestHandler((wc,p,callback,details)=>{const isTrusted=wc===window?.webContents&&details.isMainFrame;callback(!!isTrusted&&p==='media'&&'mediaTypes' in details&&!!details.mediaTypes?.length&&details.mediaTypes.every((t:string)=>t==='audio')&&getPermissions().microphone==='granted');});
 window.on('focus',changed);
 window.on('closed',()=>{window=undefined;voice.cancel();});
 if(trustedURL&&!app.isPackaged)void window.loadURL(trustedURL);else void window.loadFile(join(here,'../renderer/index.html'));
 if(smoke){window.webContents.once('did-finish-load',()=>{void(async()=>{try{const result=await window!.webContents.executeJavaScript(`(async()=>{const s=await window.toby.snapshot();return {bridge:!!window.toby,agents:s.agents.length,local:!!s.dataPath,body:document.body.innerText.length,errors:window.__tobyErrors??[]};})()`);console.log('TOBY_SMOKE',JSON.stringify(result));if(!result.bridge||!result.local||!result.body)throw Error('Packaged UI did not initialize');app.exit(0);}catch(e){console.error(e);app.exit(1);}})();});window.webContents.on('did-fail-load',(_e,code,message)=>{console.error('Load failed',code,message);app.exit(1);});const timeout=setTimeout(()=>{console.error('Smoke timeout');app.exit(1);},30_000);timeout.unref();}
 }
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Toby',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},{role:'windowMenu'}]));
 createWindow();app.on('activate',()=>{if(!window)createWindow();else window.show();});app.on('second-instance',()=>{window?.show();window?.focus();});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
 powerMonitor.on('suspend',()=>{voice.cancel();if(window&&!window.isDestroyed())window.webContents.send('toby:suspend');});powerMonitor.on('resume',changed);
 app.on('before-quit',()=>{quit=true;clearTimeout(timer);voice.dispose();harness.dispose();providers.dispose();void mcp.dispose();});app.on('will-quit',()=>{store.close();});
 if(!smoke)void providers.prepareInBackground();
}
process.on('unhandledRejection',error=>console.error('Toby background failure',error instanceof Error?error.message:String(error)));
