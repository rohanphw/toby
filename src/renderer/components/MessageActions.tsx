import { createSignal, For, Show } from 'solid-js';
import { Popover } from '@kobalte/core/popover';

const reactions = [
  {emoji:'👍',label:'Like'},
  {emoji:'❤️',label:'Love'},
  {emoji:'🎉',label:'Celebrate'},
  {emoji:'👀',label:'Watching'},
  {emoji:'✅',label:'Done'},
];

export function MessageActions(props: {
  reactions?: string[];
  copied: boolean;
  replying: boolean;
  canCopy: boolean;
  onReply: () => void;
  onCopy: () => Promise<unknown>;
  onReact: (emoji: string) => Promise<unknown>;
}) {
  const [open, setOpen] = createSignal(false);
  const [reacting, setReacting] = createSignal(false);
  const [copying, setCopying] = createSignal(false);
  async function react(emoji: string) {
    if (reacting()) return;
    setReacting(true);
    setOpen(false);
    try { await props.onReact(emoji); } finally { setReacting(false); }
  }
  async function copy() {
    if (copying()) return;
    setCopying(true);
    try { await props.onCopy(); } finally { setCopying(false); }
  }
  function navigateReactions(event: KeyboardEvent & {currentTarget: HTMLDivElement}) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : (current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }
  return <div class="message-footer" classList={{'actions-open':open(),'has-feedback':props.copied}}>
    <Show when={props.reactions?.length}><div class="message-reactions" role="group" aria-label="Your reactions">
      <For each={reactions.filter(reaction=>props.reactions?.includes(reaction.emoji))}>{reaction=><button type="button" class="reaction-chip" disabled={reacting()} aria-label={`Remove ${reaction.label} reaction`} aria-pressed="true" title={`${reaction.label} · Click to remove`} onClick={()=>void react(reaction.emoji)}><span aria-hidden="true">{reaction.emoji}</span></button>}</For>
    </div></Show>
    <div class="message-actions" role="group" aria-label="Message actions">
      <button type="button" class="message-action" classList={{active:props.replying}} aria-label="Reply to message" onClick={props.onReply}>Reply</button>
      <button type="button" class="message-action" aria-label={props.copied?'Copied':'Copy message'} disabled={!props.canCopy||copying()} onClick={()=>void copy()}>{props.copied?'Copied':'Copy'}</button>
      <Popover open={open()} onOpenChange={value=>{if(!value||!reacting())setOpen(value);}} placement="top" gutter={8}>
        <Popover.Trigger class="message-action reaction-trigger" aria-label="Add reaction" title="Add reaction" aria-disabled={reacting()}>React</Popover.Trigger>
        <Popover.Portal><Popover.Content class="reaction-picker">
          <Popover.Title class="reaction-picker-title">React to this message</Popover.Title>
          <div class="reaction-options" role="group" aria-label="Choose a reaction" onKeyDown={navigateReactions}>
            <For each={reactions}>{reaction=><button type="button" aria-label={reaction.label} aria-pressed={props.reactions?.includes(reaction.emoji)??false} title={reaction.label} onClick={()=>void react(reaction.emoji)}><span aria-hidden="true">{reaction.emoji}</span></button>}</For>
          </div>
        </Popover.Content></Popover.Portal>
      </Popover>
    </div>
    <span class="copy-feedback sr-only" role="status" aria-live="polite">{props.copied?'Copied':''}</span>
  </div>;
}
