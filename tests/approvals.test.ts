import { expect, test } from 'bun:test';
import { managedTobyCall, providerApproval, reservedConnectorName } from '../src/main/approvals';

const call = {title:'toby__toby_list_agents',rawInput:{variant:'UseTool',tool_name:'toby__toby_list_agents',tool_input:{}},_meta:{'x.ai/tool':{read_only:false}}};

test('reported list-agents call uses Toby policy only for its registered internal server', () => {
  expect(managedTobyCall(call,['toby_list_agents'],'toby')).toBe(true);
  expect(managedTobyCall(call,['toby_list_agents'],'other')).toBe(false);
  expect(managedTobyCall(call,[],'toby')).toBe(false);
});

test('titles, prefixes and provider read-only metadata cannot authorize an unrelated action', () => {
  const spoofed={...call,rawInput:{variant:'Shell',command:'rm -rf example'},_meta:{'x.ai/tool':{read_only:true}}};
  expect(managedTobyCall(spoofed,['toby_list_agents'],'toby')).toBe(false);
  for(const name of ['other__toby_list_agents','toby__toby_list_agents_extra','toby__new_unguarded_tool']) {
    expect(managedTobyCall({...call,rawInput:{...call.rawInput,tool_name:name}},['toby_list_agents','new_unguarded_tool'],'toby')).toBe(false);
  }
});

test('reserved internal connector namespaces cannot be reused', () => {
  for(const name of ['toby',' Toby ','TOBY','toby__other','toby..other']) expect(reservedConnectorName(name)).toBe(true);
  expect(reservedConnectorName('calendar')).toBe(false);
});

test('command approval exposes the actual command without protocol fields in decision copy', () => {
  const params={toolCall:{kind:'execute',rawInput:{command:['git','status','--short'],cwd:'/workspace'}}};
  const summary=providerApproval(params);
  expect(summary.title).toBe('Run a terminal command?');
  expect(summary.detail).toContain('git status --short');
  expect(summary.detail).not.toContain('rawInput');
  expect(summary.technicalDetails).toContain('rawInput');
  expect(summary.canApprove).toBe(true);
});

test('unknown connected tools remain explicit and deletion is never described as a read', () => {
  const summary=providerApproval({toolCall:{rawInput:{variant:'UseTool',tool_name:'calendar__delete_event',tool_input:{event_id:'event-123'}}}});
  expect(summary.title).toBe('Delete event?');expect(summary.detail).toContain('Delete event');expect(summary.detail).toContain('event-123');
  expect(summary.detail).not.toContain('calendar__delete_event');expect(summary.canApprove).toBe(true);
  expect(providerApproval({toolCall:{kind:'delete',rawInput:{path:'/workspace/file.txt'}}}).title).toBe('Delete a file?');
});

test('opaque actions or inputs cannot be approved through vague copy', () => {
  for(const params of [
    {toolCall:{title:'internal__secret_action',rawInput:{variant:'UseTool',tool_name:'internal__opaque_action',tool_input:{}}}},
    {toolCall:{rawInput:{variant:'UseTool',tool_name:'calendar__delete_event',tool_input:{event_id:{id:'hidden'}}}}},
    {toolCall:{rawInput:{variant:'UseTool',tool_name:'calendar__delete_event',tool_input:{event_id:'{"rawInput":{}}'}}}},
    {toolCall:{rawInput:{variant:'UseTool',tool_name:'calendar__delete_event',tool_input:[]}}},
    {toolCall:{rawInput:{variant:'UseTool',tool_name:'{"rawInput":{}}__delete_event',tool_input:{}}}},
    {toolCall:{kind:'move',rawInput:{path:'/workspace/item'}}},
  ]) {
    const summary=providerApproval(params);expect(summary.canApprove).toBe(false);
    expect(summary.title+summary.detail).not.toMatch(/rawInput|tool_name|internal__|Technical details/);
  }
});

test('additional access describes exact known scope or remains blocked', () => {
  const summary=providerApproval({permissions:{network:{enabled:true},fileSystem:{readOnly:['/workspace/notes'],readWrite:['/workspace/output']}}},true);
  expect(summary.canApprove).toBe(true);expect(summary.detail).toContain('Network access');expect(summary.detail).toContain('/workspace/output');
  expect(providerApproval({permissions:{unknownScope:{all:true}}},true).canApprove).toBe(false);
});

test('known requests carry the actual action category without trusting provider metadata', () => {
  expect(providerApproval({command:'pwd',_meta:{permission:'files'}}).permission).toBe('terminal');
  expect(providerApproval({toolCall:{kind:'read',rawInput:{path:'/notes'}}}).permission).toBe('files');
  expect(providerApproval({permissions:{network:{enabled:true}}},true).permission).toBe('network');
  expect(providerApproval({permissions:{fileSystem:{write:['/notes']}}},true).permission).toBe('files');
  expect(providerApproval({permissions:{network:{enabled:true},fileSystem:{write:['/notes']}}},true).permission).toBeUndefined();
  expect(providerApproval({toolCall:{rawInput:{variant:'UseTool',tool_name:'calendar__delete_event',tool_input:{event_id:'123'}}}}).permission).toBe('connectors');
  expect(providerApproval({_meta:{permission:'terminal'},title:'Run a command'}).canApprove).toBe(false);
});

test('file permission grants cannot conceal unrelated access or malformed paths',()=>{
 for(const fileSystem of [{network:true},{write:true},{write:[{path:'/secret'}]},{read:['/notes'],domains:['example.com']}])expect(providerApproval({permissions:{fileSystem}},true).canApprove).toBe(false);
 expect(providerApproval({permissions:{fileSystem:{read:null,write:['/notes']}}},true).permission).toBe('files');
});


test('group reactions and quiet passes use only the registered task-bound internal policy', () => {
  for(const tool of ['toby_group_react','toby_group_pass']) {
    const request={rawInput:{variant:'UseTool',tool_name:`toby__${tool}`,tool_input:{}}};
    expect(managedTobyCall(request,[tool],'toby')).toBe(true);
    expect(managedTobyCall(request,[],'toby')).toBe(false);
    expect(managedTobyCall(request,[tool],'other')).toBe(false);
  }
});
