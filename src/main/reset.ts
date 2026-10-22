import { lstat, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const marker = 'reset-pending';
const managedData = ['toby.sqlite', 'toby.sqlite-wal', 'toby.sqlite-shm', 'workspaces', 'runtimes', 'provider-probes', 'voice-models'];

export async function requestReset(root: string): Promise<void> {
  await writeFile(join(root, marker), 'Reset confirmed by the user.\n', { mode: 0o600, flag: 'wx' });
}

/** Run on a fresh launch, before opening SQLite, providers or a renderer. */
export async function completePendingReset(root: string, clearBrowserData: () => Promise<void>): Promise<boolean> {
  try { await lstat(join(root, marker)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  await clearBrowserData();
  // Fixed paths only. Never traverse agent-selected workspaces outside this root.
  for (const name of managedData) await rm(join(root, name), { recursive: true, force: true });
  await rm(join(root, marker));
  return true;
}
