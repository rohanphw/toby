import { For, Show } from 'solid-js';
import type { PermissionCategory, PermissionMode } from '../../shared/contracts';
import { PERMISSION_LABELS } from '../../shared/permissions';

export function AccessSettings(props: {
  compact?: boolean;
  mode: PermissionMode;
  notify: boolean;
  allowed?: PermissionCategory[];
  onMode: (mode: PermissionMode) => void;
  onNotify: (enabled: boolean) => void;
  onRevoke?: (permission: PermissionCategory) => void;
}) {
  return <div class="access-settings">
    <fieldset class="access-choices"><legend class="sr-only">How Toby works</legend>
      <label class="access-choice" classList={{ selected: props.mode==='full' }}>
        <input type="radio" name="toby-access" value="full" checked={props.mode==='full'} onChange={()=>props.onMode('full')}/>
        <span><strong>Let Toby work</strong><small>{props.compact?'Run commands, edit files, use apps and create specialists.':'Run commands, change files, use apps and create specialists without asking each time.'}</small></span>
      </label>
      <label class="access-choice" classList={{ selected: props.mode==='ask' }}>
        <input type="radio" name="toby-access" value="ask" checked={props.mode==='ask'} onChange={()=>props.onMode('ask')}/>
        <span><strong>Ask before taking action</strong><small>{props.compact?'Review actions and remember permissions when useful.':'Review actions as they come up. You can remember permissions along the way.'}</small></span>
      </label>
    </fieldset>
    <p class="access-note">{props.compact?'Change this anytime in Settings.':'The workspace default for teammates. Each agent can have its own access level.'}</p>
    <Show when={props.mode==='ask' && props.allowed?.length}>
      <div class="remembered-access"><strong>Always allowed</strong><For each={props.allowed}>{permission=><div><span>{PERMISSION_LABELS[permission]}</span><button type="button" onClick={()=>props.onRevoke?.(permission)} aria-label={`Ask again for ${PERMISSION_LABELS[permission]}`}>Ask again</button></div>}</For></div>
    </Show>
    <label class="access-notifications"><input type="checkbox" checked={props.notify} onChange={event=>props.onNotify(event.currentTarget.checked)}/><span><strong>Notify me when I’m needed</strong><small>{props.compact?'Mac alerts when your attention is needed.':'Mac notifications for decisions and work that needs attention.'}</small></span></label>
  </div>;
}
