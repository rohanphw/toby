import { expect, test } from 'bun:test';
import { revealLength } from '../src/renderer/streaming';

test('bursty text reveals in order and always catches up without losing Unicode', () => {
  const text = 'A complete response 👋🏽 with a link https://example.com/a-long-path and a final word.';
  let shown = 0;
  for (let frame = 0; shown < text.length && frame < 100; frame++) {
    const next = revealLength(text, shown, 16);
    expect(next).toBeGreaterThan(shown);
    expect(text.slice(0, next).endsWith('\ud83d')).toBe(false);
    shown = next;
  }
  expect(shown).toBe(text.length);
});

test('long provider bursts catch up promptly instead of creating a typing backlog', () => {
  const text = 'Streaming text. '.repeat(600);
  let shown = 0;
  for (let frame = 0; frame < 75; frame++) shown = revealLength(text, shown, 16);
  expect(shown).toBe(text.length);
});
