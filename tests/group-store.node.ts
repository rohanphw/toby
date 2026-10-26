import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/main/store';
import type { Group } from '../src/shared/contracts';

test('group leads persist across restart and edits, validate membership and repair removals', () => {
  const root = mkdtempSync(join(tmpdir(), 'toby-group-store-'));
  let store = new Store(root);
  try {
    const first = store.saveGroup({ name: 'Team', instructions: '', members: ['one', 'two'] });
    assert.equal(first.leadAgentId, 'one');
    store.saveGroup({ ...first, leadAgentId: 'two' });
    store.close();store = new Store(root);
    assert.equal(store.get<Group>('groups', first.id)?.leadAgentId, 'two');
    store.saveGroup({ id: first.id, name: 'Renamed', instructions: 'Shared purpose', members: ['one', 'two'] });
    assert.equal(store.get<Group>('groups', first.id)?.leadAgentId, 'two');
    assert.throws(() => store.saveGroup({ ...first, leadAgentId: 'outside' }), /must be a member/);
    assert.equal(store.get<Group>('groups', first.id)?.leadAgentId, 'two');
    store.saveGroup({ id: first.id, name: 'Renamed', instructions: '', members: ['one'] });
    assert.equal(store.get<Group>('groups', first.id)?.leadAgentId, 'one');
    store.put('groups', { ...first, id: 'legacy', leadAgentId: undefined });
    store.close();store = new Store(root);
    assert.equal(store.get<Group>('groups', 'legacy')?.leadAgentId, undefined, 'Loading must not migrate legacy records');
    assert.deepEqual(store.get<Group>('groups', 'legacy')?.members, ['one', 'two']);
  } finally { store.close();rmSync(root, { recursive: true, force: true }); }
});
