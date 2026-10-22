import { expect, test } from 'bun:test';
import { describeActivity, messageActivity, messageText, taskSummary } from '../src/shared/activity';

test('tool activity describes the action and its actual state without tool identifiers', () => {
  expect(describeActivity('toby_list_agents', {}, 'streaming').title).toBe('Checking your team');
  expect(describeActivity('toby__toby_list_agents').title).toBe('Checked your team');
  expect(describeActivity('toby_read_file', {}, 'failed').title).toBe('Couldn’t read the file');
  expect(describeActivity('toby_computer', {action:'screen'}, 'streaming').title).toBe('Capturing your screen');
  expect(describeActivity('toby_computer', {action:'click'}).title).toBe('Clicked in the active app');
});

test('activity exposes readable context, never input objects or result payloads', () => {
  expect(describeActivity('toby_write_file', {path:'reports/today.md',text:'{"internal":true}'})).toEqual({title:'Wrote a file',detail:'File: reports/today.md'});
  expect(describeActivity('service__search', {query:'Team lunch', secret:'token',rawInput:{tool_name:'internal'}})).toEqual({title:'Completed a connected action',detail:'Search: Team lunch'});
  expect(describeActivity('service__opaque_action', {name:'mcp__tool',path:{internal:'value'},query:'{"method":"callTool"}'})).toEqual({title:'Completed a connected action'});
  expect(describeActivity('service__opaque_action', {name:'service__delete_event'}, 'failed').title).toBe('Couldn’t complete the connected action');
  expect(describeActivity('service__opaque_action', [{title:'raw array'}]).detail).toBeUndefined();
});

test('old activity messages do not reveal result bodies or unknown tool names', () => {
  expect(messageActivity({text:'list agents\n[{"id":"agent-123","provider":"grok"}]',status:'done'})).toEqual({title:'Checked your team'});
  expect(messageActivity({text:'mcp__calendar__delete_event\nError: rawInput failed\n at executeTool',status:'failed'})).toEqual({title:'Couldn’t complete the connected action'});
  expect(messageActivity({text:'toby_read_file\n{"secret":"value"}',status:'done',activity:{title:'Read a file',detail:'File: notes.md'}})).toEqual({title:'Read a file',detail:'File: notes.md'});
});

test('internal task prompts have readable summaries while ordinary code requests stay intact', () => {
  expect(taskSummary({prompt:'Continue this previously interrupted assignment.\nraw details'})).toBe('Continue the conversation');
  expect(taskSummary({prompt:'Delegated result from Alice (internal-id):\n{"result":true}'})).toBe('Summarize a teammate’s results');
  expect(taskSummary({prompt:'Read this\nAttached local files (read with toby_read_file or local file tools):\n/path'})).toBe('Read this');
  expect(taskSummary({prompt:'Explain {"name":"toby_read_file"}'})).toBe('Explain {"name":"toby_read_file"}');
  expect(taskSummary({prompt:'internal context',displayPrompt:'Review the report'})).toBe('Review the report');
});


test('failed messages are readable across display, search, copy and quoted previews', () => {
  const diagnostic = 'mcp__calendar__delete_event: {"rawInput":{"id":"internal-123"}}';
  expect(messageText({role:'assistant',status:'failed',text:diagnostic})).toBe('Toby couldn’t complete this action. Please try again.');
  expect(messageText({role:'assistant',status:'done',text:diagnostic})).toBe(diagnostic);
  expect(messageText({role:'user',status:'failed',text:diagnostic})).toBe(diagnostic);
  expect(messageText({role:'tool',status:'done',text:'list agents\n[{"id":"agent-123"}]'})).toBe('Checked your team');
});
