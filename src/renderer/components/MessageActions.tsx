import { createSignal, For, Show } from 'solid-js';
import { Check, Copy, Reply, SmilePlus } from 'lucide-solid';
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
  agentReactions?: {agentId:string;emoji:string;name:string}[];
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
  const authors=(emoji:string)=>[...new Map((props.agentReactions??[]).filter(reaction=>reaction.emoji===emoji).map(reaction=>[reaction.agentId,reaction.name])).values()];
  const reactionCount=(emoji:string)=>(props.reactions?.includes(emoji)?1:0)+authors(emoji).length;
  const reactionTitle=(emoji:string)=>[...(props.reactions?.includes(emoji)?['You']:[]),...authors(emoji)].join(', ');
  function navigateReactions(event: KeyboardEvent & {currentTarget: HTMLDivElement}) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : (current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }
  return <div class="message-footer" classList={{'actions-open':open(),'has-feedback':props.copied}}>
    <Show when={props.reactions?.length||props.agentReactions?.length}><div class="message-reactions" role="group" aria-label="Reactions">
      <For each={reactions.filter(reaction=>reactionCount(reaction.emoji)>0)}>{reaction=><button type="button" class="reaction-chip" disabled={reacting()} aria-label={`${props.reactions?.includes(reaction.emoji)?'Remove':'Add'} ${reaction.label} reaction`} aria-pressed={props.reactions?.includes(reaction.emoji)??false} title={reactionTitle(reaction.emoji)} onClick={()=>void react(reaction.emoji)}><span aria-hidden="true">{reaction.emoji}</span><span class="reaction-count">{reactionCount(reaction.emoji)}</span></button>}</For>
    </div></Show>
    <div class="message-actions" role="group" aria-label="Message actions">
      <button type="button" class="message-action" classList={{active:props.replying}} aria-label="Reply to message" title="Reply" onClick={props.onReply}><Reply size={15}/></button>
      <button type="button" class="message-action" aria-label={props.copied?'Copied':'Copy message'} disabled={!props.canCopy||copying()} title={props.copied?'Copied':'Copy message'} onClick={()=>void copy()}><Show when={props.copied} fallback={<Copy size={14}/>}><Check size={15}/></Show></button>
      <Popover open={open()} onOpenChange={value=>{if(!value||!reacting())setOpen(value);}} placement="top" gutter={8}>
        <Popover.Trigger class="message-action reaction-trigger" aria-label="Add reaction" title="Add reaction" disabled={reacting()} aria-disabled={reacting()}><SmilePlus size={16}/></Popover.Trigger>
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
