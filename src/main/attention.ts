import type { ProviderState, Snapshot, Task } from '../shared/contracts';

export interface InterventionNotice {
  id: string;
  kind: 'approval' | 'task' | 'provider';
  title: string;
  body: string;
  chatId?: string;
}

export interface InterventionNotificationDriver {
  show(notice: InterventionNotice, onClick: () => void): { close(): void } | undefined;
}

type AttentionSnapshot = Pick<Snapshot, 'approvals' | 'tasks' | 'providers' | 'agents' | 'preferences'>;
type ActiveNotice = { close?: () => void };
// Interrupted includes deliberate Stop and permission revocation; those stay in the app.
const needsRetry = (task: Task): boolean => task.status === 'failed';
const providerIssue = (provider: ProviderState): boolean => provider.setup?.phase === 'failed' || (!provider.connected && !!provider.error?.trim() && !provider.authUrl && !provider.setup);

/** Snapshot transitions only; notification copy never includes conversation or tool content. */
export class InterventionNotifications {
  private previous?: AttentionSnapshot;
  private active = new Map<string, ActiveNotice>();
  private disposed = false;

  constructor(
    private driver: InterventionNotificationDriver,
    private onActivate: (chatId?: string) => void,
  ) {}

  update(snapshot: AttentionSnapshot): void {
    if (this.disposed) return;
    const previous = this.previous;
    // Keep a detached baseline: callers may mutate their state between emissions.
    this.previous = {
      approvals: snapshot.approvals.map(value => ({ ...value })),
      tasks: snapshot.tasks.map(value => ({ ...value })),
      providers: snapshot.providers.map(value => ({ ...value, setup: value.setup && { ...value.setup } })),
      agents: [],
      preferences: { ...snapshot.preferences },
    };
    if (snapshot.preferences.notifyOnIntervention === false) {
      this.closeAll();
      return;
    }

    const pendingChats = new Set(snapshot.approvals.map(value => value.chatId).filter(Boolean));
    const valid = new Set([
      ...snapshot.approvals.map(value => `approval:${value.id}`),
      ...snapshot.tasks.filter(value => !value.parentId && needsRetry(value) && !pendingChats.has(value.chatId)).map(value => `task:${value.id}`),
      ...snapshot.providers.filter(providerIssue).map(value => `provider:${value.provider}`),
    ]);
    for (const id of this.active.keys()) if (!valid.has(id)) this.close(id);

    const previousApprovals = new Set(previous?.approvals.map(value => value.id));
    for (const approval of snapshot.approvals) {
      if (previousApprovals.has(approval.id)) continue;
      this.show({ id: `approval:${approval.id}`, kind: 'approval', title: 'Your approval is needed', body: 'Open Toby to review a pending action.', chatId: approval.chatId });
    }
    // Existing failed tasks and disconnected providers are not startup events.
    if (!previous) return;

    const previousProviders = new Map(previous.providers.map(value => [value.provider, value]));
    const attentionProviders = new Set<string>();
    for (const provider of snapshot.providers) {
      const before = previousProviders.get(provider.provider);
      if (!providerIssue(provider) || (before && providerIssue(before))) continue;
      const setupFailed = provider.setup?.phase === 'failed';
      attentionProviders.add(provider.provider);
      this.show({
        id: `provider:${provider.provider}`, kind: 'provider',
        title: setupFailed ? 'Provider setup needs attention' : 'Connection needs attention',
        body: setupFailed ? 'Open Toby to retry setting up your provider.' : 'Open Toby to reconnect your provider.',
      });
    }

    const previousTasks = new Map(previous.tasks.map(value => [value.id, value]));
    const agents = new Map(snapshot.agents.map(value => [value.id, value]));
    for (const task of snapshot.tasks) {
      const before = previousTasks.get(task.id);
      if (task.parentId || !needsRetry(task) || (before && needsRetry(before)) || pendingChats.has(task.chatId)) continue;
      const provider = agents.get(task.agentId)?.provider;
      if (provider && (attentionProviders.has(provider) || this.active.has(`provider:${provider}`))) continue;
      this.show({ id: `task:${task.id}`, kind: 'task', title: 'A task needs your attention', body: 'Open Toby to review the task and retry when you are ready.', chatId: task.chatId });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.closeAll();
    this.previous = undefined;
  }

  private show(notice: InterventionNotice): void {
    if (this.active.has(notice.id)) return;
    const active: ActiveNotice = {};
    this.active.set(notice.id, active);
    try {
      const handle = this.driver.show(notice, () => {
        if (!this.disposed && this.active.get(notice.id) === active) this.onActivate(notice.chatId);
      });
      if (handle) active.close = () => handle.close();
      else this.active.delete(notice.id);
    } catch {
      // Desktop notification availability must not interrupt task delivery.
      this.active.delete(notice.id);
    }
  }

  private close(id: string): void {
    const active = this.active.get(id);
    this.active.delete(id);
    try { active?.close?.(); } catch { /* A dismissed native notification may already be gone. */ }
  }

  private closeAll(): void {
    for (const id of this.active.keys()) this.close(id);
  }
}
