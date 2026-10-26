import { expect, test } from 'bun:test';
import { InterventionNotifications, type InterventionNotice } from '../src/main/attention';
import type { Agent, Approval, ProviderState, Snapshot, Task } from '../src/shared/contracts';

const task = (status: Task['status'], extra: Partial<Task> = {}): Task => ({ id: 'task', chatId: 'chat', agentId: 'agent', prompt: 'PRIVATE PROMPT', result: 'PRIVATE RESULT', status, createdAt: 1, ...extra });
const approval = (extra: Partial<Approval> = {}): Approval => ({ id: 'approval', agentId: 'worker', chatId: 'root-chat', title: 'PRIVATE COMMAND', detail: 'PRIVATE DETAILS', technicalDetails: 'PRIVATE JSON', ...extra });
const provider = (extra: Partial<ProviderState> = {}): ProviderState => ({ provider: 'openai', installed: true, connected: true, models: [], ...extra });
const snapshot = (extra: Partial<Snapshot> = {}): Snapshot => ({
  agents: [{ id: 'agent', provider: 'openai' } as Agent], groups: [], messages: [], tasks: [], routines: [], skills: [], memories: [], connectors: [], approvals: [], providers: [provider()],
  preferences: { onboardingComplete: true, autoCreateAgents: false, maxConcurrency: 2, voice: '' }, permissions: { microphone: '', accessibility: false, screen: '' }, voiceModels: { ready: false, downloading: false, progress: 0 }, dataPath: '', ...extra,
});

function harness() {
  const shown: { notice: InterventionNotice; click(): void; closed: boolean }[] = [];
  const activated: (string | undefined)[] = [];
  const notifications = new InterventionNotifications({ show(notice, click) {
    const item = { notice, click, closed: false };
    shown.push(item);
    return { close() { item.closed = true; } };
  } }, chatId => activated.push(chatId));
  return { notifications, shown, activated };
}

test('initial pending approvals notify once and route to their owning root chat', () => {
  const { notifications, shown, activated } = harness();
  const state = snapshot({ approvals: [approval()] });
  notifications.update(state);
  notifications.update(state);
  expect(shown).toHaveLength(1);
  expect(shown[0].notice.kind).toBe('approval');
  shown[0].click();
  expect(activated).toEqual(['root-chat']);
  expect(JSON.stringify(shown[0].notice)).not.toContain('PRIVATE');
  expect(JSON.stringify(shown[0].notice)).not.toContain('worker');
});

test('resolved approvals close and stale clicks cannot reopen a chat', () => {
  const { notifications, shown, activated } = harness();
  notifications.update(snapshot({ approvals: [approval()] }));
  notifications.update(snapshot());
  expect(shown[0].closed).toBe(true);
  shown[0].click();
  expect(activated).toEqual([]);
});

test('disabled notifications close immediately and do not replay events on reenable', () => {
  const { notifications, shown, activated } = harness();
  notifications.update(snapshot({ approvals: [approval()] }));
  const disabled = snapshot({ approvals: [approval(), approval({ id: 'second' })], tasks: [task('failed')] });
  disabled.preferences.notifyOnIntervention = false;
  notifications.update(disabled);
  expect(shown[0].closed).toBe(true);
  shown[0].click();
  expect(activated).toEqual([]);
  disabled.preferences.notifyOnIntervention = true;
  notifications.update(disabled);
  expect(shown).toHaveLength(1);
  notifications.update(snapshot({ approvals: [approval({ id: 'new' })] }));
  expect(shown).toHaveLength(2);
});

test('initial failed and interrupted tasks stay silent; new root failure transitions notify', () => {
  const { notifications, shown, activated } = harness();
  notifications.update(snapshot({ tasks: [task('failed'), task('interrupted', { id: 'old-interrupted' })] }));
  expect(shown).toHaveLength(0);
  notifications.update(snapshot({ tasks: [task('running')] }));
  notifications.update(snapshot({ tasks: [task('failed')] }));
  notifications.update(snapshot({ tasks: [task('failed')] }));
  expect(shown).toHaveLength(1);
  shown[0].click();
  expect(activated).toEqual(['chat']);
  expect(JSON.stringify(shown[0].notice)).not.toContain('PRIVATE');
  notifications.update(snapshot({ tasks: [task('interrupted')] }));
  expect(shown[0].closed).toBe(true);
  notifications.update(snapshot({ tasks: [task('running')] }));
  notifications.update(snapshot({ tasks: [task('interrupted')] }));
  expect(shown).toHaveLength(1);
  notifications.update(snapshot({ tasks: [task('failed')] }));
  expect(shown).toHaveLength(2);
});

test('intentional stops and permission revocation interruptions never notify', () => {
  const { notifications, shown } = harness();
  notifications.update(snapshot({ tasks: [task('running')] }));
  notifications.update(snapshot({ tasks: [task('interrupted')] }));
  notifications.update(snapshot({ tasks: [task('interrupted'), task('interrupted', { id: 'another' })] }));
  expect(shown).toHaveLength(0);
});

test('new failed tasks are detected, but private child failures never notify', () => {
  const { notifications, shown } = harness();
  notifications.update(snapshot());
  notifications.update(snapshot({ tasks: [task('failed', { parentId: 'parent', id: 'child' })] }));
  expect(shown).toHaveLength(0);
  notifications.update(snapshot({ tasks: [task('failed')] }));
  expect(shown).toHaveLength(1);
});

test('pending approval takes precedence over root task failure in the same chat', () => {
  const { notifications, shown } = harness();
  notifications.update(snapshot({ tasks: [task('running')] }));
  notifications.update(snapshot({ tasks: [task('failed')], approvals: [approval({ chatId: 'chat' })] }));
  expect(shown.map(item => item.notice.kind)).toEqual(['approval']);
  notifications.update(snapshot({ tasks: [task('failed')] }));
  expect(shown).toHaveLength(1);
});

test('provider disconnect routes to settings once and suppresses related task failure', () => {
  const { notifications, shown, activated } = harness();
  notifications.update(snapshot({ tasks: [task('running')] }));
  const disconnected = snapshot({ tasks: [task('failed')], providers: [provider({ connected: false, error: 'PRIVATE AUTH DETAILS' })] });
  notifications.update(disconnected);
  notifications.update(disconnected);
  expect(shown.map(item => item.notice.kind)).toEqual(['provider']);
  shown[0].click();
  expect(activated).toEqual([undefined]);
  expect(JSON.stringify(shown[0].notice)).not.toContain('PRIVATE');
  notifications.update(snapshot());
  expect(shown[0].closed).toBe(true);
});

test('startup disconnected providers stay silent; new setup failures notify with private copy', () => {
  const { notifications, shown } = harness();
  notifications.update(snapshot({ providers: [provider({ connected: false, error: 'Existing connection issue' })] }));
  expect(shown).toHaveLength(0);
  const state = snapshot({ providers: [provider({ connected: false, setup: { phase: 'downloading', progress: 0, downloadedBytes: 0, totalBytes: 1 } })] });
  notifications.update(state);
  state.providers[0].setup!.phase = 'failed';
  state.providers[0].setup!.error = 'PRIVATE SETUP DETAILS';
  notifications.update(state);
  notifications.update(state);
  expect(shown).toHaveLength(1);
  expect(shown[0].notice.title).toBe('Provider setup needs attention');
  expect(JSON.stringify(shown[0].notice)).not.toContain('PRIVATE');
});

test('in-place task status changes are compared against a detached baseline', () => {
  const { notifications, shown } = harness();
  const state = snapshot({ tasks: [task('running')] });
  notifications.update(state);
  state.tasks[0].status = 'failed';
  notifications.update(state);
  expect(shown).toHaveLength(1);
});

test('dispose closes all notices, ignores future updates and invalidates clicks', () => {
  const { notifications, shown, activated } = harness();
  notifications.update(snapshot({ approvals: [approval(), approval({ id: 'second' })] }));
  notifications.dispose();
  notifications.dispose();
  expect(shown.every(item => item.closed)).toBe(true);
  for (const item of shown) item.click();
  notifications.update(snapshot({ approvals: [approval({ id: 'new' })] }));
  expect(shown).toHaveLength(2);
  expect(activated).toEqual([]);
});

test('unavailable or failing native notifications do not interrupt snapshots', () => {
  for (const show of [() => undefined, () => { throw new Error('Unavailable'); }]) {
    const notifications = new InterventionNotifications({ show }, () => {});
    expect(() => notifications.update(snapshot({ approvals: [approval()] }))).not.toThrow();
    expect(() => notifications.dispose()).not.toThrow();
  }
});


test('provider refresh probes stay quiet and a later actual failure notifies once', () => {
  const { notifications, shown } = harness();
  notifications.update(snapshot());
  const pending = snapshot({ providers: [provider({ connected: false })] });
  notifications.update(pending);
  notifications.update(pending);
  notifications.update(snapshot());
  expect(shown).toHaveLength(0);
  notifications.update(pending);
  const failed = snapshot({ providers: [provider({ connected: false, error: 'PRIVATE PROBE DETAILS' })] });
  notifications.update(failed);
  notifications.update(failed);
  expect(shown).toHaveLength(1);
  expect(shown[0].notice.title).toBe('Connection needs attention');
  expect(JSON.stringify(shown[0].notice)).not.toContain('PRIVATE');
  notifications.update(snapshot());
  expect(shown[0].closed).toBe(true);
});

test('active authentication and runtime preparation are not connection failures', () => {
  const { notifications, shown } = harness();
  notifications.update(snapshot());
  notifications.update(snapshot({ providers: [provider({ connected: false, error: 'Old auth error', authUrl: 'https://example.com/sign-in' })] }));
  notifications.update(snapshot({ providers: [provider({ connected: false, error: 'Old setup error', setup: { phase: 'downloading', progress: 10, downloadedBytes: 10, totalBytes: 100 } })] }));
  notifications.update(snapshot({ providers: [provider({ connected: false, error: 'Old setup error', setup: { phase: 'verifying', progress: 100, downloadedBytes: 100, totalBytes: 100 } })] }));
  notifications.update(snapshot());
  expect(shown).toHaveLength(0);
});
