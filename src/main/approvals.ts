import type { PermissionCategory } from '../shared/contracts';
const managedTools = new Set([
  'toby_list_agents', 'toby_create_agent', 'toby_send_message', 'toby_create_group',
  'toby_add_group_member', 'toby_post_group', 'toby_group_react', 'toby_group_pass', 'toby_remember', 'toby_learn_skill',
  'toby_schedule', 'toby_list_files', 'toby_read_file', 'toby_write_file',
  'toby_list_groups', 'toby_group_members', 'toby_group_history', 'toby_group_message', 'toby_group_search', 'toby_remember_group',
  'toby_share_file', 'toby_run_command', 'toby_browser_open', 'toby_browser_read',
  'toby_browser_click', 'toby_browser_type', 'toby_computer',
]);
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const label = (value: string): string => value.replace(/[_./:-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

export function reservedConnectorName(name: string): boolean {
  return /^toby(?:__|$)/i.test(name.trim().replace(/[^a-zA-Z0-9_-]/g, '_'));
}

/** Only the task-bound Toby MCP server may delegate approval to Harness. */
export function managedTobyCall(toolCall: unknown, registeredNames: readonly string[], serverName: unknown): boolean {
  if (serverName !== 'toby') return false;
  const raw = record(record(toolCall).rawInput);
  if (raw.variant !== 'UseTool' || !raw.tool_input || typeof raw.tool_input !== 'object' || Array.isArray(raw.tool_input)) return false;
  const name = text(raw.tool_name);
  return registeredNames.some(tool => managedTools.has(tool) && name === `toby__${tool}`);
}

export interface ApprovalSummary { title: string; detail: string; technicalDetails: string; canApprove: boolean; permission?: PermissionCategory; }

const inputLabels: Record<string,string> = {
  name:'Name', title:'Title', description:'Description', message:'Message', text:'Text', prompt:'Task',
  path:'File', file_path:'File', destination:'Destination', source:'Source', url:'Website', uri:'Address',
  command:'Command', cwd:'Folder', query:'Search', content:'Content', instructions:'Instructions',
  event_id:'Event', eventId:'Event', calendar_id:'Calendar', calendarId:'Calendar',
  to:'To', from:'From', recipient:'Recipient', recipients:'Recipients', subject:'Subject', body:'Message',
  start:'Start', end:'End', start_time:'Start time', end_time:'End time', time_zone:'Time zone',
  id:'Item', ids:'Items', date:'Date', location:'Location', attendees:'Attendees', enabled:'Enabled',
  agentId:'Teammate', groupId:'Group', members:'Members', personality:'Personality', specialization:'Specialization',
  intervalMinutes:'Interval in minutes', action:'Action', index:'Page element', args:'Values',
  read:'Read files', write:'Change files', readOnly:'Read files', readWrite:'Change files',
  network:'Network access', filesystem:'File access', domains:'Websites', allowedDomains:'Websites',
};
const inputValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.length <= 16000 && !/^[\s]*[\[{]|(?:toby__|toby_\w+|toolCallId|rawInput|jsonrpc)/i.test(value) ? value : undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) && value.length <= 30) { const values=value.map(inputValue);return values.every(v=>v!==undefined) ? values.join(', ') : undefined; }
};
function inputDetails(input: Record<string,unknown>): {detail:string;complete:boolean} {
  const lines:string[]=[];let complete=true;
  for(const [key,value] of Object.entries(input)) {
    if (lines.length >= 30) { complete=false;break; }
    const title=inputLabels[key], rendered=inputValue(value);
    if(!title||rendered===undefined) {complete=false;continue;}
    lines.push(`${title}: ${rendered}`);
  }
  return {detail:lines.join('\n'),complete};
}
function connectedAction(name: string): string | undefined {
  const words=name.split('__').at(-1)!.replace(/^toby_/, '').split(/[_./:-]+/).filter(Boolean);
  const verbs:Record<string,string>={list:'List',get:'Read',read:'Read',search:'Search',find:'Find',create:'Create',add:'Add',delete:'Delete',remove:'Remove',update:'Update',edit:'Edit',send:'Send',post:'Post',write:'Write',run:'Run',execute:'Run',open:'Open',share:'Share',schedule:'Schedule',remember:'Save a memory',learn:'Save a workflow'};
  const verb=verbs[words[0]];if(!verb)return;
  const nouns=words.slice(1).map(word=>({agents:'teammates',agent:'teammate',args:'details',cwd:'folder',id:'item',ids:'items'} as Record<string,string>)[word]??word).join(' ');
  return `${verb}${nouns?' '+nouns:''}`;
}

/** Product copy is explicit; an opaque action cannot be approved without understanding its scope. */
export function providerApproval(params: unknown, permissions = false): ApprovalSummary {
  const request=record(params),call=record(request.toolCall);
  const raw=Object.keys(call).length?record(call.rawInput):request;
  const technicalDetails=JSON.stringify(params,null,2)??'';
  const unknown={title:'This action needs more detail',detail:'Toby could not identify the complete action being requested. Deny it and ask the agent to try again with a specific action.',technicalDetails,canApprove:false};
  if(permissions) {
    const requested=record(request.permissions),lines:string[]=[];const categories=new Set<PermissionCategory>();let complete=true;
    for(const [kind,value] of Object.entries(requested)) {
      const access=record(value);
      if(kind==='network'&&typeof access.enabled==='boolean'&&Object.keys(access).every(k=>k==='enabled')) {lines.push(`Network access: ${access.enabled?'Allowed for this task':'Not requested'}`);if(access.enabled)categories.add('network');}
      else if(kind==='fileSystem'||kind==='filesystem') {const paths=Object.entries(access);if(!paths.length||paths.some(([key,value])=>!['read','write','readOnly','readWrite'].includes(key)||(value!==null&&(!Array.isArray(value)||value.some(path=>typeof path!=='string')))))complete=false;const details=inputDetails(Object.fromEntries(paths.filter(([,value])=>value!==null)));lines.push(details.detail);complete&&=details.complete;categories.add('files');}
      else complete=false;
    }
    return lines.filter(Boolean).length&&complete?{title:'Allow additional access?',detail:lines.filter(Boolean).join('\n'),technicalDetails,canApprove:true,permission:categories.size===1?[...categories][0]:undefined}:unknown;
  }
  const command=typeof raw.command==='string'?raw.command:Array.isArray(raw.command)&&raw.command.every(value=>typeof value==='string')?raw.command.map(value=>/^[\w./:=+-]+$/.test(value)?value:JSON.stringify(value)).join(' '):'';
  if(command)return {title:'Run a terminal command?',detail:`Run this command on your Mac${text(raw.cwd)?` in ${text(raw.cwd)}`:''}:\n\n${command}`,technicalDetails,canApprove:true,permission:'terminal'};
  if(raw.variant==='UseTool'&&text(raw.tool_name)) {
    if(!/^[a-zA-Z0-9_.:/-]+$/.test(text(raw.tool_name))||!raw.tool_input||typeof raw.tool_input!=='object'||Array.isArray(raw.tool_input))return unknown;
    const name=text(raw.tool_name),split=name.indexOf('__'),connection=split<0?'a connected app':label(name.slice(0,split)),action=connectedAction(name);
    if(!action)return unknown;
    const inputs=inputDetails(record(raw.tool_input));
    return {title:`${action}?`,detail:`${action} using ${connection}.${inputs.detail?'\n\n'+inputs.detail:''}${!inputs.complete?'\n\nSome requested details could not be explained. Deny this request and ask the agent to be more specific.':''}`,technicalDetails,canApprove:inputs.complete,permission:inputs.complete?'connectors':undefined};
  }
  const kind=text(call.kind),path=text(raw.path)||text(raw.file_path),url=text(raw.url);
  if(url&&/^https?:\/\//i.test(url))return {title:'Open a website?',detail:`Open this address:\n${url}`,technicalDetails,canApprove:true,permission:'network'};
  if(path&&['read','edit','delete','move'].includes(kind)) {
    const action=({read:'Read',edit:'Edit',delete:'Delete',move:'Move'} as Record<string,string>)[kind];
    if(kind==='move'&&!text(raw.destination))return unknown;
    return {title:`${action} a file?`,detail:`${action} this file:\n${path}${kind==='move'?`\nDestination: ${text(raw.destination)}`:''}`,technicalDetails,canApprove:true,permission:'files'};
  }
  return unknown;
}
