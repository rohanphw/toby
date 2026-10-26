import { expect, test } from 'bun:test';
import type { Message } from '../src/shared/contracts';
import { CONVERSATION_PAUSE, SENDER_GROUP_WINDOW, conversationLayout } from '../src/shared/conversation-layout';

const start = new Date(2026, 9, 27, 10).getTime();
const message = (id: string, input: Partial<Message> = {}): Message => ({ id, chatId:'group', senderId:'toby', role:'assistant', text:'Hello', status:'done', createdAt:start, ...input });

test('the screenshot greeting keeps Jules and Toby as siblings of the same human post', () => {
  const messages = [
    message('design-human',{senderId:'user',role:'user',text:'hey guys'}),
    message('design-jules',{senderId:'jules',replyTo:'design-human',createdAt:start+60_000}),
    message('design-toby',{senderId:'toby',replyTo:'design-human',createdAt:start+180_000}),
  ];
  expect([...conversationLayout(messages).values()].map(row=>row.reply)).toEqual(['none','local','local']);
  expect(conversationLayout(messages).get('design-toby')?.grouped).toBe(false);
});

test('same sender groups only with an adjacent same-target message within five minutes', () => {
  const messages = [message('one'), message('two',{createdAt:start+1}), message('target-change',{replyTo:'one',createdAt:start+2}), message('sender-change',{senderId:'jules',createdAt:start+3}), message('late',{senderId:'jules',createdAt:start+SENDER_GROUP_WINDOW+4})];
  expect([...conversationLayout(messages).values()].map(row=>row.grouped)).toEqual([false,true,false,false,false]);
  expect(conversationLayout([message('one'),message('user',{role:'user'})]).get('user')?.grouped).toBe(false);
});

test('layout preserves input chronology and decorates useful pauses without crossing days', () => {
  const messages = [message('one'),message('pause',{createdAt:start+CONVERSATION_PAUSE}),message('tomorrow',{createdAt:start+24*60*60*1000})];
  expect([...conversationLayout(messages).keys()]).toEqual(['one','pause','tomorrow']);
  expect([...conversationLayout(messages).values()].map(row=>row.pause)).toEqual([false,true,false]);
  expect(messages.map(row=>row.id)).toEqual(['one','pause','tomorrow']);
});

test('only an explicit adjacent visible reply gets a shallow connector', () => {
  const messages = [message('parent',{role:'user',senderId:'user'}),message('reply',{replyTo:'parent',createdAt:start+1}),message('continuation',{replyTo:'parent',createdAt:start+2}),message('nested',{replyTo:'continuation',senderId:'jules',createdAt:start+3}),message('mention',{text:'@Toby hello',createdAt:start+4})];
  expect([...conversationLayout(messages).values()].map(row=>row.reply)).toEqual(['none','local','local','reference','none']);
  expect(conversationLayout(messages).get('continuation')?.grouped).toBe(true);
});

test('intervening speakers, activity, old targets and search filters cannot create long connectors', () => {
  const parent = message('parent');
  const middle = message('middle',{senderId:'jules',createdAt:start+1});
  const reply = message('reply',{replyTo:'parent',createdAt:start+2});
  expect(conversationLayout([parent,middle,reply]).get('reply')?.reply).toBe('reference');
  expect(conversationLayout([parent,{...middle,role:'tool'},reply]).get('reply')?.reply).toBe('reference');
  expect(conversationLayout([parent,{...reply,createdAt:start+SENDER_GROUP_WINDOW+1}]).get('reply')?.reply).toBe('reference');
  expect(conversationLayout([parent,middle,reply],[parent,reply]).get('reply')?.reply).toBe('reference');
  expect(conversationLayout([parent,reply],[reply]).get('reply')?.reply).toBe('reference');
  expect(conversationLayout([parent,middle,reply],[parent,reply]).get('reply')?.grouped).toBe(false);
});

test('hidden, missing, future and operational targets never expose or invent a relationship', () => {
  const reply = message('reply',{replyTo:'parent',createdAt:start+1});
  for (const parent of [undefined,message('parent',{audience:'internal'}),message('parent',{role:'tool'})]) {
    const result = conversationLayout(parent?[parent,reply]:[reply]).get('reply');
    expect(result?.reply).toBe('reference');
    expect(result?.targetId).toBeUndefined();
  }
  expect(conversationLayout([reply,message('parent')]).get('reply')?.targetId).toBeUndefined();
});


test('day changes and reverse timestamps break grouping and local connectors', () => {
  const midnight = new Date(2026, 9, 28).getTime();
  const first = message('first',{createdAt:midnight-1});
  const next = message('next',{createdAt:midnight,replyTo:'first'});
  expect(conversationLayout([first,next]).get('next')?.reply).toBe('reference');
  expect(conversationLayout([first,{...next,replyTo:undefined}]).get('next')?.grouped).toBe(false);
  const reversed = conversationLayout([message('first'),message('next',{createdAt:start-1,replyTo:'first'})]).get('next');
  expect(reversed?.reply).toBe('reference');
  expect(reversed?.grouped).toBe(false);
});

test('a shared parent stem crosses grouped continuations only to reach a later sibling header', () => {
  const messages = [
    message('parent',{role:'user',senderId:'user'}),
    message('jules',{senderId:'jules',replyTo:'parent',createdAt:start+1}),
    message('jules-more',{senderId:'jules',replyTo:'parent',createdAt:start+2}),
    message('toby',{replyTo:'parent',createdAt:start+3}),
    message('toby-more',{replyTo:'parent',createdAt:start+4}),
  ];
  const rows = [...conversationLayout(messages).values()];
  expect(rows.map(row=>row.grouped)).toEqual([false,false,true,false,true]);
  expect(rows.map(row=>row.reply)).toEqual(['none','local','local','local','local']);
  expect(rows.map(row=>row.replyStem)).toEqual([true,true,true,false,false]);
  expect(rows.slice(1).map(row=>row.targetId)).toEqual(['parent','parent','parent','parent']);
  expect([...conversationLayout(messages).keys()]).toEqual(messages.map(row=>row.id));
  expect(conversationLayout(messages.slice(0,3)).get('jules')?.replyStem).toBe(false);
});

test('unrelated messages, system events, tools and hidden cluster members break a sibling run', () => {
  const parent = message('parent',{role:'user',senderId:'user'});
  const first = message('first',{senderId:'jules',replyTo:'parent',createdAt:start+1});
  const last = message('last',{replyTo:'parent',createdAt:start+3});
  for (const middle of [
    message('middle',{senderId:'jules',createdAt:start+2}),
    message('middle',{role:'system',createdAt:start+2}),
    message('middle',{role:'tool',createdAt:start+2}),
    message('middle',{audience:'internal',replyTo:'parent',createdAt:start+2}),
    message('middle',{replyTo:'first',createdAt:start+2}),
  ]) {
    const layout = conversationLayout([parent,first,middle,last]);
    expect(layout.get('last')?.reply).toBe('reference');
    expect(layout.get('first')?.replyStem).toBe(false);
    expect(layout.get('middle')?.replyStem).toBe(false);
  }
  const messages = [parent,first,message('middle',{senderId:'jules',replyTo:'parent',createdAt:start+2}),last];
  const filtered = conversationLayout(messages,[parent,first,last]);
  expect(filtered.get('last')?.reply).toBe('reference');
  expect(filtered.get('first')?.replyStem).toBe(false);
  expect([...conversationLayout(messages,[first,messages[2],last]).values()].every(row=>row.reply==='reference'&&!row.replyStem)).toBe(true);
});

test('a sibling gap or calendar boundary ends the shared stem', () => {
  const midnight = new Date(2026,9,28).getTime();
  for (const [firstTime,lastTime] of [
    [start+1,start+SENDER_GROUP_WINDOW+2],
    [midnight-1,midnight],
    [start+1,start],
  ]) {
    const messages = [
      message('parent',{role:'user',senderId:'user',createdAt:firstTime-1}),
      message('first',{senderId:'jules',replyTo:'parent',createdAt:firstTime}),
      message('last',{replyTo:'parent',createdAt:lastTime}),
    ];
    const layout = conversationLayout(messages);
    expect(layout.get('first')?.reply).toBe('local');
    expect(layout.get('first')?.replyStem).toBe(false);
    expect(layout.get('last')?.reply).toBe('reference');
  }
});

test('a grouped root parent connects through its own identity block without repeating the author', () => {
  const messages = [
    message('user-first',{role:'user',senderId:'user'}),
    message('user-more',{role:'user',senderId:'user',createdAt:start+1}),
    message('parent',{role:'user',senderId:'user',createdAt:start+2}),
    message('jules',{senderId:'jules',replyTo:'parent',createdAt:start+3}),
    message('toby',{replyTo:'parent',createdAt:start+4}),
  ];
  const rows = [...conversationLayout(messages).values()];
  expect(rows.map(row=>row.grouped)).toEqual([false,true,true,false,false]);
  expect(rows.map(row=>row.replyStem)).toEqual([true,true,true,true,false]);
  expect(rows.slice(3).map(row=>row.targetId)).toEqual(['parent','parent']);
  expect([...conversationLayout(messages,messages.slice(1)).values()].map(row=>row.grouped)).toEqual([false,true,false,false]);
  expect([...conversationLayout(messages,messages.filter(row=>row.id!=='parent')).values()].every(row=>!row.replyStem)).toBe(true);
});
