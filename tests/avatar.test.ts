import { expect, test } from 'bun:test';
import { AGENT_AVATARS, agentAvatar } from '../src/shared/avatar';

test('legacy Toby uses the fox and explicit avatars remain unchanged', () => {
  expect(agentAvatar({id:'lead',name:'Toby',avatar:'toby'})).toBe('🦊');
  expect(agentAvatar({id:'lead',name:'Toby'})).toBe('🦊');
  expect(agentAvatar({id:'lead',name:'Toby',avatar:'🐙'})).toBe('🐙');
  expect(AGENT_AVATARS).not.toContain('toby');
});

test('missing and legacy avatars have a stable identity-based fallback', () => {
  const legacy = {id:'researcher',name:'Researcher',avatar:'toby'};
  const expected = agentAvatar(legacy);
  expect(agentAvatar({...legacy,avatar:''})).toBe(expected);
  expect(agentAvatar({id:legacy.id})).toBe(expected);
  expect(agentAvatar({...legacy,name:'Analyst'})).toBe(expected);
  expect(legacy.avatar).toBe('toby');
  expect(new Set(Array.from({length:24},(_,index)=>agentAvatar({id:`agent-${index}`}))).size).toBeGreaterThan(1);
});
