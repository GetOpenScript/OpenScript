import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapScriptCode, getTabButtons, clickTabButton } from '../src/utils/userScripts.js';

const runWrapped = async code => {
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  globalThis.__resolve_done = resolveDone;
  new Function(wrapScriptCode(`${code}\nglobalThis.__resolve_done();`))();
  await done;
  delete globalThis.__resolve_done;
  return globalThis.__OpenScriptButtons;
};

test('OpenScript.button registers, clicks, and removes popup buttons', async () => {
  const clicks = [];
  globalThis.__clicks = clicks;
  try {
    const registry = await runWrapped(`
      OpenScript.button('Settings', () => globalThis.__clicks.push('settings'));
      const remove = OpenScript.button('<b>Temp</b>', () => globalThis.__clicks.push('temp'));
      globalThis.__remove = remove;
    `);
    assert.deepEqual(registry.list(), [{ id: 1, label: 'Settings' }, { id: 2, label: '<b>Temp</b>' }]);

    assert.equal(registry.click(1), true);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.deepEqual(clicks, ['settings']);

    globalThis.__remove();
    assert.deepEqual(registry.list(), [{ id: 1, label: 'Settings' }]);
    assert.equal(registry.click(2), false);
  } finally {
    delete globalThis.__clicks;
    delete globalThis.__remove;
    delete globalThis.__OpenScriptButtons;
    delete globalThis.OpenScript;
    delete globalThis.env;
  }
});

test('OpenScript.button rejects missing click handlers', async () => {
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  globalThis.__resolve_done = resolveDone;
  try {
    new Function(wrapScriptCode(`
      try { OpenScript.button('Broken'); } catch (error) { globalThis.__resolve_done(error); }
    `))();
    const error = await done;
    assert.equal(error.name, 'TypeError');
  } finally {
    delete globalThis.__resolve_done;
    delete globalThis.__OpenScriptButtons;
    delete globalThis.OpenScript;
    delete globalThis.env;
  }
});

test('getTabButtons queries enabled script worlds and clickTabButton targets the document', async () => {
  const originalChrome = globalThis.chrome;
  const calls = [];
  globalThis.chrome = {
    userScripts: {
      execute: async injection => {
        calls.push(injection);
        if (injection.worldId === 'broken') throw new Error('Cannot access a chrome:// URL');
        if (injection.js[0].code.includes('.click(')) return [{ documentId: 'doc1', result: true }];
        return injection.worldId === 'a'
          ? [{ documentId: 'doc1', result: [{ id: 1, label: 'Settings' }] }]
          : [{ documentId: 'doc1', result: undefined }];
      },
    },
  };

  try {
    const buttons = await getTabButtons(7, [
      { id: 'a', enabled: true },
      { id: 'b', enabled: true },
      { id: 'off', enabled: false },
      { id: 'broken', enabled: true },
    ]);
    assert.deepEqual(buttons, { a: [{ id: 1, label: 'Settings', documentId: 'doc1' }] });
    assert.deepEqual(calls.map(c => c.worldId), ['a', 'b', 'broken']);
    assert.deepEqual(calls[0].target, { tabId: 7 });

    assert.equal(await clickTabButton(7, 'a', buttons.a[0]), true);
    assert.deepEqual(calls.at(-1).target, { tabId: 7, documentIds: ['doc1'] });
    assert.equal(calls.at(-1).worldId, 'a');
    assert.match(calls.at(-1).js[0].code, /__OpenScriptButtons\?\.click\(1\)/);
  } finally {
    globalThis.chrome = originalChrome;
  }
});
