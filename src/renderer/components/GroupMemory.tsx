import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js';
import type { Group, Snapshot } from '../../shared/contracts';

export function GroupMemoryPanel(props: { group: Group; snapshot: Snapshot; run: (action:()=>unknown|Promise<unknown>)=>Promise<unknown> }) {
  const [editing,setEditing]=createSignal(false);
  const [id,setId]=createSignal<string>();
  const [text,setText]=createSignal('');
  const [busy,setBusy]=createSignal(false);
  const memories=createMemo(()=>props.snapshot.groupMemories?.filter(memory=>memory.groupId===props.group.id)??[]);
  function reset(){setEditing(false);setId(undefined);setText('');}
  createEffect(()=>{props.group.id;untrack(reset);});
  async function save(event:SubmitEvent){
    event.preventDefault();if(busy()||!text().trim())return;
    setBusy(true);
    try{await props.run(async()=>{await window.toby.saveGroupMemory({id:id(),groupId:props.group.id,text:text()});reset();});}
    finally{setBusy(false);}
  }
  return <div class="group-memory-panel">
    <div class="row"><h3>Shared memory</h3><Show when={!editing()}><button onClick={()=>{reset();setEditing(true);}}>Add memory</button></Show></div>
    <p class="muted">Decisions and facts every channel member can use. Personal agent memories stay separate.</p>
    <For each={memories()}>{memory=><section class="task"><p class="entry-text">{memory.text}</p><Show when={memory.sourceMessageIds?.length}><small>{memory.sourceMessageIds!.length} source {memory.sourceMessageIds!.length===1?'message':'messages'}</small></Show><div class="actions"><button onClick={()=>{setId(memory.id);setText(memory.text);setEditing(true);}}>Edit</button><button class="danger" onClick={()=>props.run(async()=>{await window.toby.deleteGroupMemory(props.group.id,memory.id);if(id()===memory.id)reset();})}>Remove</button></div></section>}</For>
    <Show when={!memories().length&&!editing()}><p class="empty-list">No shared facts saved yet.</p></Show>
    <Show when={editing()}><form class="stack-form library-form" onSubmit={save}><label>What should this channel remember?<textarea required maxlength={4000} value={text()} onInput={event=>setText(event.currentTarget.value)}/></label><button class="primary" disabled={busy()||!text().trim()}>{busy()?'Saving…':'Save'}</button><button type="button" class="text-button" disabled={busy()} onClick={reset}>Cancel</button></form></Show>
  </div>;
}
