import { createEffect, createSignal, onCleanup, untrack, type Accessor } from 'solid-js';

/** Reveal a burst at word boundaries while keeping at most a short backlog. */
export function revealLength(text: string, shown: number, elapsed: number): number {
  if (shown >= text.length) return text.length;
  const step = Math.max(1, Math.ceil((180 + (text.length - shown) / 0.12) * Math.min(elapsed, 50) / 1000));
  let end = Math.min(text.length, shown + step);
  // Keep Unicode code points intact, including emoji arriving in provider chunks.
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end++;
  const boundary = text.lastIndexOf(' ', end);
  if (boundary > shown) end = boundary + 1;
  return Math.min(text.length, end);
}

export function useStreamingText(text: Accessor<string>, streaming: Accessor<boolean>): Accessor<string> {
  const [visible, setVisible] = createSignal('');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let target = '', frame = 0, previousTime = 0, live = false;
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
  const tick = (now: number) => {
    frame = 0;
    const current = visible();
    setVisible(target.slice(0, revealLength(target, current.length, now - previousTime || 16)));
    previousTime = now;
    if (visible().length < target.length) frame = requestAnimationFrame(tick);
  };
  createEffect(() => {
    const next = text(), active = streaming();
    if (motion.matches || (!live && !active) || !next.startsWith(untrack(visible))) {
      cancel(); setVisible(next);
    }
    target = next; live = active;
    if (untrack(visible).length < next.length && !frame) {
      previousTime = performance.now(); frame = requestAnimationFrame(tick);
    }
  });
  const reduced = () => { if (motion.matches) { cancel(); setVisible(target); } };
  motion.addEventListener('change', reduced);
  onCleanup(() => { cancel(); motion.removeEventListener('change', reduced); });
  return visible;
}
