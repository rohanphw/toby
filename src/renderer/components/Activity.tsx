import { createMemo, createSignal, createUniqueId, For, Show } from 'solid-js';
import { Check, ChevronRight, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-solid';
import type { Agent, Approval, Message } from '../../shared/contracts';
import { messageActivity } from '../../shared/activity';
import { MessageAttachments } from './MessageAttachments';
import { PERMISSION_LABELS } from '../../shared/permissions';

export function ApprovalCard(props: { approval: Approval; agentName: string; queueLabel?: string; onResolve: (allowed: boolean, alwaysAllow?: boolean) => Promise<unknown> }) {
  const [resolving, setResolving] = createSignal(false);
  const [error, setError] = createSignal('');
  async function resolve(allowed: boolean, alwaysAllow=false) {
    if (resolving() || (allowed && props.approval.canApprove === false)) return;
    setError('');
    setResolving(true);
    try { await props.onResolve(allowed,alwaysAllow); }
    catch { setError('Your decision could not be saved. Please try again.'); }
    finally { setResolving(false); }
  }
  return <section class="approval" aria-labelledby={`approval-${props.approval.id}`} aria-busy={resolving()}>
    <div class="approval-body">
      <div class="approval-icon" aria-hidden="true"><ShieldCheck size={17}/></div>
      <div class="approval-copy">
        <div class="approval-attribution"><span>{props.agentName} needs permission</span><Show when={props.queueLabel}><span class="approval-queue">{props.queueLabel}</span></Show></div>
        <strong id={`approval-${props.approval.id}`}>{props.approval.title}</strong>
        <p>{props.approval.detail}</p>
      </div>
    </div>
    <Show when={error()}><p class="approval-error" role="alert">{error()}</p></Show>
    <div class="approval-footer">
      <span class="approval-scope" role="status"><Show when={resolving()} fallback={props.approval.canApprove === false ? 'This action cannot be allowed.' : 'Permission for this action only.'}><LoaderCircle size={12} class="activity-spinner" aria-hidden="true"/>Saving decision…</Show></span>
      <div class="actions"><button type="button" disabled={resolving()} aria-label={`Deny: ${props.approval.title}`} onClick={()=>resolve(false)}>Deny</button><Show when={props.approval.canApprove!==false?props.approval.permission:undefined}>{permission=><button type="button" class="always-allow" disabled={resolving()} aria-label={`Always allow ${PERMISSION_LABELS[permission()]}`} onClick={()=>resolve(true,true)}>Always allow {PERMISSION_LABELS[permission()]}</button>}</Show><button type="button" class="primary" disabled={resolving() || props.approval.canApprove===false} aria-label={`Allow once: ${props.approval.title}`} onClick={()=>resolve(true)}>Allow once</button></div>
    </div>
  </section>;
}

export function ToolActivity(props: { message: Message; agentName: string; onOpenAttachment: (id: string) => Promise<unknown> }) {
  const activity = createMemo(() => messageActivity(props.message));
  return <div class={`tool-activity ${props.message.status ?? 'done'}`}>
    <div class="activity-heading"><Show when={props.message.status === 'failed'} fallback={<Show when={props.message.status === 'streaming'} fallback={<Check size={13}/>}><LoaderCircle size={13} class="activity-spinner"/></Show>}><CircleAlert size={13}/></Show><span class="activity-label">{activity().title}</span><small>{props.agentName}</small></div>
    <Show when={activity().detail}><p class="activity-detail">{activity().detail}</p></Show>
    <Show when={props.message.attachments?.length}><MessageAttachments attachments={props.message.attachments!} onOpen={props.onOpenAttachment}/></Show>
  </div>;
}

export function ActivityGroup(props: { messages: Message[]; agents: Agent[]; onOpenAttachment: (id: string) => Promise<unknown> }) {
  const [expanded, setExpanded] = createSignal(false);
  const contentId = `activity-${createUniqueId()}`;
  const messages = createMemo(() => props.messages.filter(message => message.role === 'tool' && message.audience !== 'internal'));
  const failed = createMemo(() => messages().some(message => message.status === 'failed'));
  const working = createMemo(() => messages().some(message => message.status === 'streaming'));
  const summary = createMemo(() => failed() ? 'Some actions need attention' : working() ? 'Working…' : `${messages().length} ${messages().length === 1 ? 'action' : 'actions'} completed`);
  return <Show when={messages().length}>
    <section class="activity-group" classList={{ failed: failed() }}>
      <button type="button" class="activity-group-toggle" aria-expanded={expanded()} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>
        <ChevronRight size={13} class="activity-chevron" classList={{ expanded: expanded() }} aria-hidden="true"/>
        <Show when={failed()} fallback={<Show when={working()} fallback={<Check size={13} aria-hidden="true"/>}><LoaderCircle size={13} class="activity-spinner" aria-hidden="true"/></Show>}><CircleAlert size={13} aria-hidden="true"/></Show>
        <span>{summary()}</span>
      </button>
      <div id={contentId} class="activity-group-content" hidden={!expanded()}>
        <Show when={expanded()}><For each={messages()}>{message => <ToolActivity message={message} agentName={props.agents.find(agent => agent.id === message.senderId)?.name ?? 'Toby'} onOpenAttachment={props.onOpenAttachment}/>}</For></Show>
      </div>
    </section>
  </Show>;
}

export function WorkingIndicator(props: { waiting?: boolean; group?: boolean; count?: number }) {
  return <div class="working-indicator" role="status"><span class="working-dots" aria-hidden="true"><i/><i/><i/></span><span>{(props.count??0)>1?props.waiting?`Waiting for teammates on ${props.count} tasks`:`Working on ${props.count} tasks`:props.group?'Your team is working':props.waiting ? 'Waiting for teammates' : 'Preparing a response'}</span></div>;
}
