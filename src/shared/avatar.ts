import type { Agent } from './contracts';

export const AGENT_AVATARS = ['🦊','🌱','🐻','🦉','🐼','🐙','🌙','☀️','🦋','🐬','🌻','🐝'] as const;

export function agentAvatar(agent: Pick<Agent,'id'> & Partial<Pick<Agent,'name'|'avatar'>>): string {
  if (agent.avatar?.trim() && agent.avatar !== 'toby') return agent.avatar;
  if (agent.name === 'Toby') return AGENT_AVATARS[0];
  let hash = 0;
  for (const character of agent.id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return AGENT_AVATARS[hash % AGENT_AVATARS.length];
}
