import test from 'node:test';
import assert from 'node:assert/strict';
import { runScriptFetch } from '../src/utils/fetch.js';
import { wrapScriptCode } from '../src/utils/userScripts.js';

test('runScriptFetch performs background fetch and serializes response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => new Response(JSON.stringify({ hello: 'world' }), {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json', 'x-custom': 'val' },
  });

  try {
    const result = await runScriptFetch('https://api.example.com/test', { method: 'GET' });
    assert.equal(result.status, 200);
    assert.equal(result.statusText, 'OK');
    assert.ok(result.headers.some(([k, v]) => k === 'content-type' && v === 'application/json'));
    assert.ok(result.body instanceof ArrayBuffer);
    const decoded = JSON.parse(new TextDecoder().decode(result.body));
    assert.deepEqual(decoded, { hello: 'world' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runScriptFetch handles null-body statuses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204, statusText: 'No Content' });

  try {
    const result = await runScriptFetch('https://api.example.com/empty');
    assert.equal(result.status, 204);
    assert.equal(result.body, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runScriptFetch forwards errors on network failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Failed to fetch'); };

  try {
    await assert.rejects(() => runScriptFetch('https://broken.example.com'), /Failed to fetch/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenScript.fetch runtime wrapper reconstructs a native Response', async () => {
  const originalChrome = globalThis.chrome;
  const mockPayload = {
    status: 200,
    statusText: 'OK',
    headers: [['content-type', 'application/json'], ['x-powered-by', 'openscript']],
    url: 'https://api.example.com/redirected',
    body: new TextEncoder().encode(JSON.stringify({ success: true })).buffer,
  };

  globalThis.chrome = {
    runtime: {
      sendMessage: async msg => {
        if (msg.type === 'OPEN_SCRIPT_FETCH') {
          assert.equal(msg.url, 'https://api.example.com/data');
          assert.equal(msg.options.headers['authorization'], 'Bearer 123');
          return { ok: true, ...mockPayload };
        }
        return { ok: false, error: 'unknown' };
      },
    },
  };

  let resolveDone;
  const donePromise = new Promise(resolve => { resolveDone = resolve; });
  globalThis.__resolve_done = resolveDone;

  const scriptCode = `
    const res = await OpenScript.fetch('https://api.example.com/data', {
      headers: new Headers({ authorization: 'Bearer 123' }),
    });
    globalThis.__resolve_done({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      header: res.headers.get('x-powered-by'),
      data: await res.json(),
    });
  `;

  try {
    const wrapped = wrapScriptCode(scriptCode);
    const fn = new Function(wrapped);
    fn();
    const result = await donePromise;
    assert.deepEqual(result, {
      ok: true,
      status: 200,
      statusText: 'OK',
      url: 'https://api.example.com/redirected',
      header: 'openscript',
      data: { success: true },
    });
  } finally {
    delete globalThis.__resolve_done;
    globalThis.chrome = originalChrome;
  }
});

test('OpenScript.fetch throws TypeError when request fails', async () => {
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    runtime: {
      sendMessage: async () => ({ ok: false, error: 'Network error' }),
    },
  };

  let resolveDone;
  const donePromise = new Promise(resolve => { resolveDone = resolve; });
  globalThis.__resolve_done = resolveDone;

  const scriptCode = `
    try {
      await OpenScript.fetch('https://broken.example.com');
    } catch (err) {
      globalThis.__resolve_done({ name: err.name, message: err.message });
    }
  `;

  try {
    const wrapped = wrapScriptCode(scriptCode);
    const fn = new Function(wrapped);
    fn();
    const err = await donePromise;
    assert.equal(err.name, 'TypeError');
    assert.equal(err.message, 'Network error');
  } finally {
    delete globalThis.__resolve_done;
    globalThis.chrome = originalChrome;
  }
});
