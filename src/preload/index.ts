import { contextBridge, ipcRenderer } from 'electron';
import type { TobyAPI, Snapshot, Message } from '../shared/contracts';
const methods=['snapshot','setAgentVisibility','chooseAttachments','openAttachment','toggleReaction','saveAgent','deleteAgent','saveGroup','send','stop','resumeTask','setPreferences','resetApp','connectProvider','refreshProviders','prepareProvider','requestPermission','openPermissionSettings','transcribe','cancelVoice','saveMemory','deleteMemory','saveSkill','deleteSkill','saveRoutine','deleteRoutine','saveConnector','deleteConnector','resolveApproval','openWorkspace','openExternal','chooseWorkspace','openBrowser','listFiles','readFile'] as const;
const api:Record<string,unknown>={};
for(const method of methods)api[method]=(...args:unknown[])=>ipcRenderer.invoke('toby:invoke',method,args);
api.onChange=(callback:(snapshot:Snapshot)=>void)=>{const listener=(_event:unknown,value:Snapshot)=>callback(value);ipcRenderer.on('toby:changed',listener);return()=>ipcRenderer.removeListener('toby:changed',listener);};
api.onMessage=(callback:(message:Message)=>void)=>{const listener=(_event:unknown,value:Message)=>callback(value);ipcRenderer.on('toby:message',listener);return()=>ipcRenderer.removeListener('toby:message',listener);};
api.onSuspend=(callback:()=>void)=>{const listener=()=>callback();ipcRenderer.on('toby:suspend',listener);return()=>ipcRenderer.removeListener('toby:suspend',listener);};
contextBridge.exposeInMainWorld('toby',Object.freeze(api) as unknown as TobyAPI);
