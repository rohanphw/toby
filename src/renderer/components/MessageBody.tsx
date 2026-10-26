import { createEffect, createMemo } from 'solid-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useStreamingText } from '../streaming';

export function MessageBody(props: { text: string; markdown?: boolean; streaming?: boolean; mentions?: string[]; onContentChange?: () => void }) {
  const visible = useStreamingText(() => props.text, () => !!props.streaming);
  createEffect(() => { visible(); queueMicrotask(() => props.onContentChange?.()); });
  const html = createMemo(() => {
    const content = document.createElement('div');
    if (props.markdown) content.innerHTML = DOMPurify.sanitize(marked.parse(visible(), { async: false, gfm: true, breaks: false }), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['img', 'video', 'audio', 'iframe', 'form', 'input', 'button', 'style'],
      FORBID_ATTR: ['style'],
    });
    else content.textContent = visible();
    const names = [...new Set(props.mentions?.filter(Boolean))].sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    if (names.length) {
      const mention = new RegExp(`(^|[\\s([{])@(${names.join('|')})(?=$|[\\s.,!?;:)}\\]—-])`, 'giu');
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('pre, code, a')) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        const text = node.textContent ?? '', matches = [...text.matchAll(mention)];
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        for (const match of matches) {
          const start = match.index! + match[1].length;
          fragment.append(document.createTextNode(text.slice(cursor,start)));
          const label = document.createElement('span'); label.className = 'message-mention'; label.textContent = `@${match[2]}`;
          fragment.append(label); cursor = start + match[2].length + 1;
        }
        fragment.append(document.createTextNode(text.slice(cursor))); node.replaceWith(fragment);
      }
    }
    return content.innerHTML;
  });
  function openLink(event: MouseEvent) {
    const link = (event.target as Element).closest('a');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (href && /^https?:\/\//i.test(href)) void window.toby.openExternal(href);
  }
  return <div class="message-text" classList={{markdown:props.markdown,'is-streaming':props.streaming}} innerHTML={html()} onClick={openLink}/>;
}
