import { createMemo, createSignal, Show } from 'solid-js';
import { Check, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-solid';
import type { Approval, Message } from '../../shared/contracts';
import { messageActivity } from '../../shared/activity';
import { MessageAttachments } from './MessageAttachments';

export function ApprovalCard(props: { approval: Approval; agentName: string; onResolve: (allowed: boolean) => Promise<unknown> }) {
  const [resolving, setResolving] = createSignal(false);
  async function resolve(allowed: boolean) {
    if (resolving()) return;
    setResolving(true);
    try { await props.onResolve(allowed); } finally { setResolving(false); }
  }
  return <section class="approval" aria-labelledby={`approval-${props.approval.id}`}>
    <div class="approval-attribution"><ShieldCheck size={14}/><span>{props.agentName} needs your permission</span></div>
    <strong id={`approval-${props.approval.id}`}>{props.approval.title}</strong>
    <p>{props.approval.detail}</p>
    <div class="actions"><button disabled={resolving()} aria-label={`Deny: ${props.approval.title}`} onClick={()=>resolve(false)}>Deny</button><button class="primary" disabled={resolving() || props.approval.canApprove===false} aria-label={`Allow once: ${props.approval.title}`} onClick={()=>resolve(true)}>Allow once</button></div>
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
