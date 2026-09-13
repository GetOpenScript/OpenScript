import test from 'node:test';
import assert from 'node:assert/strict';
import { runScriptFetch } from '../src/utils/fetch.js';
import { wrapScriptCode } from '../src/utils/userScripts.js';

test('runScriptFetch performs background fetch and serializes response text', async () => {
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
    assert.equal(typeof result.body, 'string');
    assert.deepEqual(JSON.parse(result.body), { hello: 'world' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runScriptFetch handles binary arraybuffer responses', async () => {
  const originalFetch = globalThis.fetch;
  const binaryData = new Uint8Array([1, 2, 3, 4, 255]);
  globalThis.fetch = async () => new Response(binaryData.buffer, {
    status: 200,
    headers: { 'content-type': 'application/octet-stream' },
  });

  try {
    const result = await runScriptFetch('https://api.example.com/binary', { responseType: 'arraybuffer' });
    assert.equal(result.status, 200);
    assert.ok(result.base64);
    assert.equal(typeof result.base64, 'string');
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

test('OpenScript.fetch runtime wrapper reconstructs a native Response for JSON text', async () => {
  const originalChrome = globalThis.chrome;
  const mockPayload = {
    status: 200,
    statusText: 'OK',
    headers: [['content-type', 'application/json'], ['x-powered-by', 'openscript']],
    url: 'https://api.example.com/redirected',
    body: JSON.stringify({ success: true }),
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

test('OpenScript.fetch runtime wrapper decodes base64 binary responses', async () => {
  const originalChrome = globalThis.chrome;
  const mockPayload = {
    status: 200,
    statusText: 'OK',
    headers: [['content-type', 'application/octet-stream']],
    url: 'https://api.example.com/image.bin',
    base64: 'AQID/w==',
  };

  globalThis.chrome = {
    runtime: {
      sendMessage: async () => ({ ok: true, ...mockPayload }),
    },
  };

  let resolveDone;
  const donePromise = new Promise(resolve => { resolveDone = resolve; });
  globalThis.__resolve_done = resolveDone;

  const scriptCode = `
    const res = await OpenScript.fetch('https://api.example.com/image.bin', { responseType: 'arraybuffer' });
    const buf = await res.arrayBuffer();
    globalThis.__resolve_done({
      ok: res.ok,
      byteLength: buf.byteLength,
      bytes: [...new Uint8Array(buf)],
    });
  `;

  try {
    const wrapped = wrapScriptCode(scriptCode);
    const fn = new Function(wrapped);
    fn();
    const result = await donePromise;
    assert.deepEqual(result, {
      ok: true,
      byteLength: 4,
      bytes: [1, 2, 3, 255],
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
