import test from 'node:test';
import assert from 'node:assert/strict';
import {
  garbageCollectScriptStorage, runScriptStorageOperation,
} from '../src/utils/storage.js';

const mockChromeStorage = initial => {
  const data = structuredClone(initial);
  globalThis.chrome = { storage: { local: {
    get: async key => key === null ? { ...data } : Object.hasOwn(data, key) ? { [key]: data[key] } : {},
    set: async values => Object.assign(data, values),
    remove: async keys => [keys].flat().forEach(key => delete data[key]),
  } } };
  return data;
};

test('script storage isolates, lists, and deletes values by script ID', async () => {
  const data = mockChromeStorage({
    scripts: [
      { id: 'script_a', storageToken: 'token-a' },
      { id: 'script_b', storageToken: 'token-b' },
    ],
    storage_script_b_shared: 'private-b',
  });

  await runScriptStorageOperation('token-a', 'set', 'shared', { count: 1 });
  assert.deepEqual(data.storage_script_a_shared, { count: 1 });
  assert.deepEqual(await runScriptStorageOperation('token-a', 'get', 'shared'), {
    found: true, value: { count: 1 },
  });
  assert.deepEqual(await runScriptStorageOperation('token-a', 'get', 'missing'), {
    found: false, value: undefined,
  });
  assert.deepEqual(await runScriptStorageOperation('token-a', 'list'), { keys: ['shared'] });
  await runScriptStorageOperation('token-a', 'delete', 'shared');
  assert.equal(data.storage_script_a_shared, undefined);
  await assert.rejects(() => runScriptStorageOperation('token-bad', 'list'), /Invalid script storage token/);
});

test('script storage garbage collection removes only orphaned script keys', async () => {
  const data = mockChromeStorage({
    scripts: [{ id: 'script_a' }],
    storage_script_a_keep: 1,
    storage_script_deleted_remove: 2,
    unrelated: 3,
  });
  const removed = await garbageCollectScriptStorage(['script_a']);
  assert.deepEqual(removed, ['storage_script_deleted_remove']);
  assert.equal(data.storage_script_a_keep, 1);
  assert.equal(data.storage_script_deleted_remove, undefined);
  assert.equal(data.unrelated, 3);
});
