import { createEffect, createMemo, Show } from 'solid-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useStreamingText } from '../streaming';

export function MessageBody(props: { text: string; markdown?: boolean; streaming?: boolean; onContentChange?: () => void }) {
  const visible = useStreamingText(() => props.text, () => !!props.streaming);
  createEffect(() => { visible(); queueMicrotask(() => props.onContentChange?.()); });
  const html = createMemo(() => DOMPurify.sanitize(marked.parse(visible(), { async: false, gfm: true, breaks: false }), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['img', 'video', 'audio', 'iframe', 'form', 'input', 'button', 'style'],
    FORBID_ATTR: ['style'],
  }));
  function openLink(event: MouseEvent) {
    const link = (event.target as Element).closest('a');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (href && /^https?:\/\//i.test(href)) void window.toby.openExternal(href);
  }
  return <Show when={props.markdown} fallback={<div class="message-text">{props.text}</div>}><div class={`message-text markdown ${props.streaming ? 'is-streaming' : ''}`} innerHTML={html()} onClick={openLink}/></Show>;
}
