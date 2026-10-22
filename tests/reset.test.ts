import { expect, test } from 'bun:test';
import { lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { completePendingReset, requestReset } from '../src/main/reset';

test('normal launch never resets data without a confirmed request', async () => {
  const root = await mkdtemp(join(tmpdir(), 'toby-no-reset-'));
  try {
    await writeFile(join(root, 'toby.sqlite'), 'keep database');
    expect(await completePendingReset(root, async () => { throw Error('Must not clear browser'); })).toBe(false);
    expect(await readFile(join(root, 'toby.sqlite'), 'utf8')).toBe('keep database');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('confirmed reset removes managed data without following workspace symlinks', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'toby-reset-'));
  const root = join(parent, 'profile'), external = join(parent, 'external');
  try {
    await mkdir(root); await mkdir(external); await writeFile(join(external, 'keep.txt'), 'external file');
    for (const file of ['toby.sqlite', 'toby.sqlite-wal', 'toby.sqlite-shm']) await writeFile(join(root, file), 'old data');
    for (const directory of ['workspaces', 'runtimes', 'provider-probes', 'voice-models']) {
      await mkdir(join(root, directory)); await writeFile(join(root, directory, 'old'), 'old data');
    }
    await symlink(external, join(root, 'workspaces', 'linked-folder'));
    await requestReset(root);
    let cleared = false;
    expect(await completePendingReset(root, async () => { cleared = true; })).toBe(true);
    expect(cleared).toBe(true);
    for (const name of ['toby.sqlite', 'toby.sqlite-wal', 'toby.sqlite-shm', 'workspaces', 'runtimes', 'provider-probes', 'voice-models', 'reset-pending']) {
      await expect(lstat(join(root, name))).rejects.toMatchObject({ code: 'ENOENT' });
    }
    expect(await readFile(join(external, 'keep.txt'), 'utf8')).toBe('external file');
    expect(await completePendingReset(root, async () => { throw Error('Already reset'); })).toBe(false);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('failed cleanup retains the reset request for a safe retry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'toby-reset-retry-'));
  try {
    await writeFile(join(root, 'toby.sqlite'), 'old database'); await requestReset(root);
    await expect(completePendingReset(root, async () => { throw Error('Storage unavailable'); })).rejects.toThrow('Storage unavailable');
    expect(await readFile(join(root, 'toby.sqlite'), 'utf8')).toBe('old database');
    expect(await readFile(join(root, 'reset-pending'), 'utf8')).toContain('confirmed');
    expect(await completePendingReset(root, async () => {})).toBe(true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
