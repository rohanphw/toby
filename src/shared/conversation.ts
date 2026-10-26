import type { Message, Snapshot, Task } from './contracts';
import { messageActivity, messageText, taskSummary } from './activity';

/** The same publication boundary is used for snapshots, live events and history. */
export function publicMessage(message: Message, tasks: Task[]): Message | undefined {
  if (message.audience === 'internal') return;
  if (message.correlationId && message.role !== 'user') {
    const task = tasks.find(task => task.id === message.correlationId);
    // Workers cannot publish, even if a stored record has a public audience tag.
    if (task?.parentId) return;
    // Participation publishes only completed, deliberately public assistant posts.
    if (task?.channelParticipation && (message.role !== 'assistant' || message.audience !== 'public' || message.status !== 'done')) return;
    // Older versions stored delegation briefs and replies as ordinary messages.
    if (message.role !== 'tool' && message.audience !== 'public' && tasks.some(child => child.parentId === message.correlationId)) return;
  }
  if (message.role === 'tool') {
    const activity = messageActivity(message);
    return { ...message, text: messageText(message), activity };
  }
  return { ...message, text: messageText(message) };
}

export function publicSnapshot(snapshot: Snapshot): Snapshot {
  const messages = snapshot.messages.flatMap(message => {
    const visible = publicMessage(message, snapshot.tasks);
    return visible ? [visible] : [];
  }).sort((a, b) => a.createdAt - b.createdAt || Number(a.role === 'assistant') - Number(b.role === 'assistant'));
  return {
    ...snapshot,
    messages,
    tasks: snapshot.tasks.map(task => ({
      ...task,
      prompt: '',
      displayPrompt: task.parentId ? 'Helping a teammate' : task.channelParticipation ? 'Participating in the conversation' : taskSummary(task),
      result: undefined,
    })),
    approvals: snapshot.approvals.map(({ technicalDetails: _private, ...approval }) => approval),
  };
}

export type ConversationRow = { id: string; kind: 'message'; message: Message } | { id: string; kind: 'activity'; messages: Message[] };

/** Consecutive operational records share one disclosure, with a stable row key. */
export function conversationRows(messages: Message[]): ConversationRow[] {
  const rows: ConversationRow[] = [];
  for (const message of messages) {
    if (message.audience === 'internal') continue;
    const previous = rows.at(-1);
    if (message.role === 'tool') {
      if (previous?.kind === 'activity') previous.messages.push(message);
      else rows.push({ id: message.id, kind: 'activity', messages: [message] });
    } else rows.push({ id: message.id, kind: 'message', message });
  }
  return rows;
}
