import { createSignal, For, Show } from 'solid-js';
import { FileText, LoaderCircle } from 'lucide-solid';
import type { Attachment } from '../../shared/contracts';

export function MessageAttachments(props: { attachments: Attachment[]; onOpen: (id: string) => Promise<unknown> }) {
  const [opening, setOpening] = createSignal('');
  async function open(id: string) {
    if (opening()) return;
    setOpening(id);
    try { await props.onOpen(id); } finally { setOpening(''); }
  }
  return <div class="message-attachments"><For each={props.attachments}>{file=><button type="button" disabled={!!opening()} aria-label={`Open ${file.name}`} aria-busy={opening()===file.id} title={`Open ${file.name}`} onClick={()=>void open(file.id)}><Show when={opening()===file.id} fallback={<FileText size={16}/>}><LoaderCircle size={16} class="activity-spinner"/></Show><span>{file.name}</span><small>{opening()===file.id?'Opening…':`${Math.max(1,Math.round(file.bytes/1024))} KB`}</small></button>}</For></div>;
}
