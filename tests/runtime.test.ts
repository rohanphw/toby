import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRuntime } from '../src/main/runtime';
import type { ProviderSetup } from '../src/shared/contracts';

test('download progress reports received bytes and corrupt runtimes never replace an installation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'toby-runtime-'));
  const originalFetch = globalThis.fetch;
  try {
    const directory = join(root, 'runtimes/grok/bin');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'grok'), 'existing executable');
    globalThis.fetch = (async () => new Response('untrusted bytes', { headers: { 'content-length': '15' } })) as typeof fetch;
    const progress: ProviderSetup[] = [];
    await expect(prepareRuntime(root, 'grok', true, state => progress.push(state))).rejects.toThrow('checksum');
    expect(await readFile(join(directory, 'grok'), 'utf8')).toBe('existing executable');
    expect(progress.at(-1)).toEqual({ phase: 'verifying', progress: 100, downloadedBytes: 15, totalBytes: 15 });
  } finally { globalThis.fetch = originalFetch; await rm(root, { recursive: true, force: true }); }
});

test('cancelling setup prevents installation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'toby-runtime-abort-'));
  const originalFetch = globalThis.fetch, abort = new AbortController();
  try {
    globalThis.fetch = (async () => {
      abort.abort(); return new Response('never install this');
    }) as typeof fetch;
    await expect(prepareRuntime(root, 'grok', true, undefined, abort.signal)).rejects.toThrow();
    await expect(readFile(join(root, 'runtimes/grok/bin/grok'))).rejects.toThrow();
  } finally { globalThis.fetch = originalFetch; await rm(root, { recursive: true, force: true }); }
});
