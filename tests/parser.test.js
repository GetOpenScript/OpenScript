import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMeta, normalizeMatch, getBoilerplate } from '../src/utils/parser.js';
import {
  buildScriptCode, refreshRequireCaches, syncUserScripts, wrapScriptCode,
} from '../src/utils/userScripts.js';

test('parseMeta extracts only OpenScript metadata', () => {
  const meta = parseMeta(`
// ==UserScript==
// @name         Test Script
// @version      2.1.0
// @description  Sample description
// @author       Alice
// @namespace    legacy
// @match        https://example.com/*
// @include      https://ignored.example/*
// @run-at       document-start
// @grant        none
// @require      https://cdn.example/library.js
// ==/UserScript==
`);

  assert.deepEqual(meta, {
    name: 'Test Script',
    description: 'Sample description',
    matches: ['https://example.com/*'],
    runAt: 'document_start',
    requires: ['https://cdn.example/library.js'],
  });
});

test('parseMeta falls back to defaults when fields are missing', () => {
  const meta = parseMeta('// ==UserScript==\n// ==/UserScript==');
  assert.equal(meta.name, 'Untitled Script');
  assert.equal(meta.description, '');
  assert.deepEqual(meta.matches, ['*://*/*']);
  assert.equal(meta.runAt, 'document_idle');
  assert.deepEqual(meta.requires, []);
});

test('normalizeMatch formats URL patterns for Chrome userScripts API', () => {
  assert.equal(normalizeMatch('https://example.com'), 'https://example.com/*');
  assert.equal(normalizeMatch('example.com/*'), '*://example.com/*');
  assert.equal(normalizeMatch('*://*/*'), '*://*/*');
});

test('wrapScriptCode provides async OpenScript APIs without GM polyfills', () => {
  const code = 'const cached = await OpenScript.storage.get("cache");\nif (!cached) return;';
  const wrapped = wrapScriptCode(code, { API_KEY: 'secret123' }, 'storage-token');

  assert.match(wrapped, /async function\(OpenScript, env\)/);
  assert.ok(wrapped.includes('"API_KEY":"secret123"'));
  assert.ok(wrapped.includes("call('list')"));
  assert.ok(wrapped.includes('storage-token'));
  assert.ok(wrapped.includes(code));
  assert.ok(!wrapped.includes('GM_getValue'));
  assert.doesNotThrow(() => new Function(wrapped));
});

test('buildScriptCode prepends cached requirements in declared order', () => {
  const script = {
    code: 'useLibraries();',
    requires: ['https://cdn.example/a.js', 'https://cdn.example/b.js'],
    requireCache: {
      'https://cdn.example/a.js': 'const a = 1;',
      'https://cdn.example/b.js': 'const b = 2;',
    },
  };
  const bundle = buildScriptCode(script);
  assert.ok(bundle.indexOf('const a = 1;') < bundle.indexOf('const b = 2;'));
  assert.ok(bundle.indexOf('const b = 2;') < bundle.indexOf('useLibraries();'));
});

test('refreshRequireCaches downloads once and falls back to cached code', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    if (url.endsWith('bad.js')) throw new Error('offline');
    return { ok: true, text: async () => 'globalThis.library = true;' };
  };

  try {
    const good = 'https://cdn.example/good.js';
    const bad = 'https://cdn.example/bad.js';
    const result = await refreshRequireCaches([
      { name: 'One', requires: [good, bad], requireCache: { [bad]: 'cached();' } },
      { name: 'Two', requires: [good] },
    ]);
    assert.equal(calls, 2);
    assert.equal(result.scripts[0].requireCache[good], 'globalThis.library = true;');
    assert.equal(result.scripts[0].requireCache[bad], 'cached();');
    assert.equal(result.scripts[1].requireCache[good], 'globalThis.library = true;');
    assert.equal(result.warnings.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('syncUserScripts migrates tokens and registers isolated script worlds', async () => {
  const originalChrome = globalThis.chrome;
  const data = {
    scripts: [{ id: 'script_1', name: 'One', code: 'return;', enabled: true, matches: ['*://*/*'] }],
    secrets: { TOKEN: 'secret' },
  };
  let registered;
  const configured = [];
  globalThis.chrome = {
    storage: {
      local: {
        get: async key => ({ [key]: data[key] }),
        set: async values => Object.assign(data, values),
      },
      sync: { get: async key => ({ [key]: data[key] }) },
    },
    userScripts: {
      getScripts: async () => [],
      configureWorld: async value => configured.push(value),
      register: async value => { registered = value; },
    },
  };

  try {
    const result = await syncUserScripts();
    assert.equal(result.success, true);
    assert.ok(data.scripts[0].storageToken);
    assert.deepEqual(configured, [{ worldId: 'script_1', messaging: true }]);
    assert.equal(registered[0].worldId, 'script_1');
    assert.ok(registered[0].js[0].code.includes('"TOKEN":"secret"'));
  } finally {
    globalThis.chrome = originalChrome;
  }
});

test('getBoilerplate is wrapper-free and minimalist', () => {
  const template = getBoilerplate('My Script');
  assert.ok(template.includes('// @name         My Script'));
  assert.ok(template.includes("console.log('Running on', location.hostname);"));
  for (const legacy of ['@namespace', '@grant', '@version', '@author', '(function'])
    assert.ok(!template.includes(legacy));
});
