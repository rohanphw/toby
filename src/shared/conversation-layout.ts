import type { Message } from './contracts';

export const SENDER_GROUP_WINDOW = 5 * 60 * 1000;
export const CONVERSATION_PAUSE = 30 * 60 * 1000;

export type MessageLayout = {
  grouped: boolean;
  pause: boolean;
  reply: 'none' | 'local' | 'reference';
  replyStem: boolean;
  targetId?: string;
};

/** Decorate the existing chronology; filtering must never invent adjacency. */
export function conversationLayout(messages: Message[], visible: Message[] = messages): Map<string, MessageLayout> {
  const layout = new Map<string, MessageLayout>();
  const positions = new Map(messages.map((message, index) => [message.id, index]));
  const visibleIds = new Set(visible.map(message => message.id));
  const conversational = (row: Message) => (row.role === 'user' || row.role === 'assistant') && row.audience !== 'internal';
  for (const message of visible) {
    const index = positions.get(message.id);
    const previous = index === undefined ? undefined : messages[index - 1];
    const elapsed = previous ? message.createdAt - previous.createdAt : 0;
    const adjacent = !!previous && visibleIds.has(previous.id) && conversational(previous) && conversational(message);
    const sameDay = !!previous && new Date(previous.createdAt).toDateString() === new Date(message.createdAt).toDateString();
    const grouped = adjacent && sameDay && elapsed >= 0 && elapsed <= SENDER_GROUP_WINDOW
      && previous.role === message.role && previous.senderId === message.senderId
      && previous.replyTo === message.replyTo && previous.routineId === message.routineId;
    const targetIndex = message.replyTo ? positions.get(message.replyTo) : undefined;
    const target = targetIndex === undefined ? undefined : messages[targetIndex];
    const validTarget = target && index !== undefined && targetIndex! < index && conversational(target);
    const previousLayout = previous && layout.get(previous.id);
    // Only the parent or a contiguous reply to that same parent can extend a cluster.
    // Replies to an already indented row use a reference instead of nesting further.
    const local = validTarget && adjacent && sameDay && elapsed >= 0 && elapsed <= SENDER_GROUP_WINDOW
      && (previous.id === target.id && previousLayout?.reply !== 'local'
        || previousLayout?.reply === 'local' && previousLayout.targetId === target.id);
    layout.set(message.id, {
      grouped,
      pause: !!previous && sameDay && elapsed >= CONVERSATION_PAUSE,
      reply: message.replyTo ? local ? 'local' : 'reference' : 'none',
      replyStem: false,
      targetId: validTarget ? target.id : undefined,
    });
  }
  // A continuation shares its author's identity block. Carry the stem through its
  // full height to a later sibling header, or back to a grouped parent's avatar.
  // The final reply identity has no outgoing stem alongside its continuation body.
  for (let index = visible.length - 2; index >= 0; index--) {
    const next = layout.get(visible[index + 1].id)!;
    if (next.reply === 'local' && !next.grouped || next.grouped && next.replyStem) layout.get(visible[index].id)!.replyStem = true;
  }
  return layout;
}
