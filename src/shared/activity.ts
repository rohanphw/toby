import type { Message, Task } from './contracts';
import { publicError } from './errors';

export interface ActivitySummary { title: string; detail?: string; }

const labels: Record<string, [string, string, string]> = {
  'list agents': ['Checking your team', 'Checked your team', 'Couldn’t check your team'],
  'create agent': ['Creating a teammate', 'Created a teammate', 'Couldn’t create a teammate'],
  'send message': ['Sending a message', 'Sent a message', 'Couldn’t send the message'],
  'list groups': ['Checking your channels', 'Checked your channels', 'Couldn’t check your channels'],
  'group members': ['Checking channel members', 'Checked channel members', 'Couldn’t check channel members'],
  'group history': ['Reading channel history', 'Read channel history', 'Couldn’t read channel history'],
  'group message': ['Reading an earlier message', 'Read an earlier message', 'Couldn’t read the message'],
  'group search': ['Finding shared context', 'Found shared context', 'Couldn’t search shared context'],
  'remember group': ['Saving a shared fact', 'Saved a shared fact', 'Couldn’t save the shared fact'],
  'create group': ['Creating a group', 'Created a group', 'Couldn’t create the group'],
  'add group member': ['Adding a group member', 'Added a group member', 'Couldn’t add the group member'],
  'post group': ['Posting to the group', 'Posted to the group', 'Couldn’t post to the group'],
  'remember': ['Saving a memory', 'Saved a memory', 'Couldn’t save the memory'],
  'learn skill': ['Saving a skill', 'Saved a skill', 'Couldn’t save the skill'],
  'schedule': ['Scheduling a routine', 'Scheduled a routine', 'Couldn’t schedule the routine'],
  'list files': ['Checking workspace files', 'Checked workspace files', 'Couldn’t check workspace files'],
  'read file': ['Reading a file', 'Read a file', 'Couldn’t read the file'],
  'write file': ['Writing a file', 'Wrote a file', 'Couldn’t write the file'],
  'share file': ['Sharing a file', 'Shared a file', 'Couldn’t share the file'],
  'run command': ['Running a command', 'Ran a command', 'Couldn’t run the command'],
  'browser open': ['Opening a website', 'Opened a website', 'Couldn’t open the website'],
  'browser read': ['Reading a website', 'Read a website', 'Couldn’t read the website'],
  'browser click': ['Clicking on a webpage', 'Clicked on a webpage', 'Couldn’t click on the webpage'],
  'browser type': ['Entering text on a webpage', 'Entered text on a webpage', 'Couldn’t enter text on the webpage'],
  'browser action': ['Working in the browser', 'Completed a browser action', 'Couldn’t complete the browser action'],
  'computer': ['Working on your Mac', 'Completed a Mac action', 'Couldn’t complete the Mac action'],
  'computer screen': ['Capturing your screen', 'Captured your screen', 'Couldn’t capture your screen'],
  'computer describe': ['Reading the active app', 'Read the active app', 'Couldn’t read the active app'],
  'computer click': ['Clicking in the active app', 'Clicked in the active app', 'Couldn’t click in the active app'],
  'computer move': ['Moving the pointer', 'Moved the pointer', 'Couldn’t move the pointer'],
  'computer type': ['Typing in the active app', 'Typed in the active app', 'Couldn’t type in the active app'],
  'computer key': ['Pressing a key', 'Pressed a key', 'Couldn’t press the key'],
  'computer scroll': ['Scrolling the active app', 'Scrolled the active app', 'Couldn’t scroll the active app'],
};

function contextValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const text = value.trim();
  if (!text || /^[\[{]/.test(text) || /(?:toby_|mcp__|\w+__\w+|rawInput|tool_input|tool_name|jsonrpc)/i.test(text)) return;
  return text.length > 240 ? `${text.slice(0,237)}…` : text;
}

export function describeActivity(name: string, args: unknown = {}, status: Message['status'] = 'done'): ActivitySummary {
  const key = name.trim().toLowerCase().replace(/^(?:(?:mcp|toby)[_\s]+)+/, '').replaceAll('_', ' ').replace(/\s+/g, ' ');
  const input = args && typeof args === 'object' && !Array.isArray(args) ? args as Record<string, unknown> : {};
  const action = key === 'computer' && typeof input.action === 'string' ? labels[`computer ${input.action}`] : undefined;
  const title = (action ?? labels[key] ?? ['Using a connected service', 'Completed a connected action', 'Couldn’t complete the connected action'])[status === 'failed' ? 2 : status === 'streaming' ? 0 : 1];
  const context = (key.startsWith('group ')||key==='list groups'||key==='remember group')?[]:['path', 'url', 'query', 'name', 'title'].flatMap(field => {
    const value = contextValue(input[field]);
    if (!value) return [];
    const prefix = {path:'File',url:'Website',query:'Search',name:'Name',title:'Title'}[field];
    return [`${prefix}: ${value}`];
  });
  return { title, ...(context.length ? {detail:context.slice(0,2).join('\n')} : {}) };
}

export function messageActivity(message: Pick<Message, 'text' | 'status' | 'activity'>): ActivitySummary {
  // Older transcripts contain tool results after this line, including JSON and logs.
  return message.activity ?? describeActivity(message.text.split('\n', 1)[0], {}, message.status);
}

export function messageText(message: Pick<Message, 'text' | 'status' | 'activity' | 'role'>): string {
  if (message.role === 'tool') {
    const activity = messageActivity(message);
    return [activity.title, activity.detail].filter(Boolean).join('\n');
  }
  if (message.role !== 'user' && message.status === 'failed') return publicError(message.text);
  return message.text;
}

export function taskSummary(task: Pick<Task, 'prompt' | 'displayPrompt'>): string {
  if (task.displayPrompt) return task.displayPrompt;
  if (task.prompt.startsWith('Continue this previously interrupted assignment.')) return 'Continue the conversation';
  if (task.prompt.startsWith('Delegation to ')) return 'Review a teammate’s unfinished work';
  if (task.prompt.startsWith('Delegated result from ')) return 'Summarize a teammate’s results';
  return task.prompt
    .replace(/^This instruction was dictated\. Respond in text, using normal formatting\.\n/, '')
    .split('\nAttached local files (read with toby_read_file or local file tools):\n', 1)[0] || 'Review attached files';
}
