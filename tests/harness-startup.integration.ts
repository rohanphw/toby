import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import { Harness } from '../src/main/harness';
import type { Agent, Message, Task } from '../src/shared/contracts';

void app.whenReady().then(async () => {
  app.dock?.hide();
  const root = await mkdtemp(join(tmpdir(), 'toby-startup-test-'));
  const store = new Store(root);
  const waiters = new Set<() => void>();
  const changed = () => { for (const check of [...waiters]) check(); };
  const waitFor = (predicate: () => boolean, label: string) => new Promise<void>((resolve, reject) => {
    const check = () => { if (predicate()) { clearTimeout(timer);waiters.delete(check);resolve(); } };
    const timer = setTimeout(() => { waiters.delete(check);reject(Error(`Timed out: ${label}`)); }, 5000);
    waiters.add(check);check();
  });
  const unhandled: unknown[] = [];
  const onUnhandled = (error: unknown) => unhandled.push(error);
  process.on('unhandledRejection', onUnhandled);
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...values: unknown[]) => { logs.push(values.join(' ')); };
  let failRegistration = false, contexts = 0;
  const providers: any = {
    states: [{ provider: 'openai', connected: true, models: [{ id: 'test' }] }],
    turn: async () => 'Completed safely.',
  };
  const mcp: any = { register() {
    if (failRegistration) { failRegistration = false;throw Error('PRIVATE MCP STARTUP DETAIL'); }
    contexts++;
    return { server: {}, dispose() { contexts--; } };
  } };
  const harness = new Harness(store, providers, mcp, { close() {} } as any, '/missing', changed);
  const tasks = () => store.all<Task>('tasks');
  const done = (prompt: string) => waitFor(() => tasks().some(task => task.prompt === prompt && task.status === 'done'), prompt);
  const put = store.put.bind(store);
  let failedWrites = 0;
  let mode: 'once' | 'persistent' | 'none' = 'once';
  (store as any).put = (table: string, value: any) => {
    const target = value.prompt === 'one-off startup' || value.prompt === 'persistent startup' || value.prompt === 'child startup';
    if (table === 'tasks' && target && (value.status === 'running' || value.status === 'failed') && mode !== 'none') {
      failedWrites++;
      if (mode === 'once') mode = 'none';
      throw Error('PRIVATE SQLITE CONSTRAINT DETAIL');
    }
    return put(table as any, value);
  };
  try {
    const first = harness.saveAgent({ name: 'Toby', personality: '', specialization: '', provider: 'openai', model: 'test' });
    const second = harness.saveAgent({ name: 'Worker', personality: '', specialization: '', provider: 'openai', model: 'test' });
    await harness.send(first.id, 'one-off startup');
    await waitFor(() => tasks().some(task => task.prompt === 'one-off startup' && task.status === 'failed'), 'one-off failure persisted');
    const failed = tasks().find(task => task.prompt === 'one-off startup')!;
    assert.equal(failedWrites, 1);
    assert(!failed.result?.includes('PRIVATE'));
    assert.equal(store.get<Agent>('agents', first.id)?.status, 'idle');
    await harness.drain();await harness.drain();
    assert.equal(failedWrites, 1, 'The failed start is never retried automatically');
    harness.resumeTask(failed.id);
    await waitFor(() => tasks().some(task => task.id !== failed.id && task.prompt.startsWith('Continue this previously interrupted assignment.') && task.status === 'done'), 'explicit fresh retry');

    mode = 'persistent';failedWrites = 0;
    await harness.send(first.id, 'persistent startup');
    await harness.send(first.id, 'unrelated work');await done('unrelated work');
    assert.equal(failedWrites, 2, 'One failed start and one failed failure-record write');
    assert.equal(tasks().find(task => task.prompt === 'persistent startup')?.status, 'queued');
    for (let i = 0; i < 10; i++) await harness.drain();
    assert.equal(failedWrites, 2, 'A task that cannot record its failure stays blocked');
    assert.equal(store.get<Agent>('agents', first.id)?.status, 'idle');
    assert.equal(logs.length, 1);
    assert(!logs.join('').includes('PRIVATE'));
    await harness.stop(first.id);
    assert.equal(tasks().find(task => task.prompt === 'persistent startup')?.status, 'interrupted');

    mode = 'once';failedWrites = 0;
    const parent = store.task({ agentId: first.id, chatId: first.id, prompt: 'parent synthesis' });
    put('tasks', { ...parent, status: 'waiting' });
    store.task({ agentId: second.id, chatId: second.id, prompt: 'child startup', parentId: parent.id, rootId: parent.id });
    await harness.drain();await done('parent synthesis');
    assert.equal(tasks().find(task => task.prompt === 'child startup')?.status, 'failed');
    assert.equal(failedWrites, 1, 'Failed worker startup returns a result to its waiting owner');

    failRegistration = true;
    await harness.send(first.id, 'registration failure');
    await waitFor(() => tasks().some(task => task.prompt === 'registration failure' && task.status === 'failed'), 'MCP registration failure');
    const registration = tasks().find(task => task.prompt === 'registration failure')!;
    const message = store.all<Message>('messages').find(message => message.correlationId === registration.id && message.role === 'assistant');
    assert.equal(message?.status, 'failed');
    assert.equal(message?.audience, 'public');
    assert(!message?.text.includes('PRIVATE'));
    assert.equal(harness.streamingMessages.size, 0);
    assert.equal(contexts, 0);
    assert.equal(store.get<Agent>('agents', first.id)?.status, 'idle');
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
    console.log('HARNESS_STARTUP_INTEGRATION_PASS: bounded failed starts, failed persistence, unrelated work, explicit retry, child result return, interrupted stop, safe copy, stream cleanup and no unhandled rejection');
  } finally {
    (store as any).put = put;
    await harness.shutdown();
    process.off('unhandledRejection', onUnhandled);
    console.error = originalError;
    store.close();await rm(root, { recursive: true, force: true });
  }
  app.exit(0);
}).catch(error => { console.error(error);app.exit(1); });
