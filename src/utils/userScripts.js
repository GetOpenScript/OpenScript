import { getScripts, saveScripts, getSecrets } from './storage.js';
import { normalizeMatch, parseMeta, getMetaRunAt } from './parser.js';
import { VERSION } from '../version.js';

const STORAGE_MESSAGE = 'OPEN_SCRIPT_STORAGE';
const FETCH_MESSAGE = 'OPEN_SCRIPT_FETCH';

export const isUserScriptsAvailable = async () => {
  if (!chrome.userScripts) return false;
  try {
    await chrome.userScripts.getScripts();
    return true;
  } catch {
    return false;
  }
};

export const wrapScriptCode = (code, secrets = {}, storageToken = '') => `
// [OpenScript runtime]
(async function(OpenScript, env) {
  'use strict';
${code}
})(...(() => {
  const env = Object.freeze(${JSON.stringify(secrets)});
  const call = async (operation, key, value) => {
    const response = await chrome.runtime.sendMessage({
      type: '${STORAGE_MESSAGE}', token: ${JSON.stringify(storageToken)}, operation, key, value
    });
    if (!response?.ok) throw new Error(response?.error || 'OpenScript storage request failed');
    return response;
  };
  const storage = Object.freeze({
    set: (key, value) => call('set', key, value).then(() => undefined),
    get: key => call('get', key).then(result => result.found ? result.value : undefined),
    delete: key => call('delete', key).then(() => undefined),
    list: () => call('list').then(result => result.keys),
  });
  const fetch = async (url, options = {}) => {
    let { headers, body, ...rest } = options;
    if (headers instanceof Headers) headers = Object.fromEntries(headers.entries());
    const response = await chrome.runtime.sendMessage({
      type: '${FETCH_MESSAGE}', url: url.toString(), options: { ...rest, headers, body },
    });
    if (!response?.ok) throw new TypeError(response?.error || 'OpenScript fetch failed');
    let resBody = null;
    if (![101, 204, 205, 304].includes(response.status)) {
      if (response.base64 !== undefined) {
        const bin = atob(response.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resBody = bytes.buffer;
      } else {
        resBody = response.body ?? null;
      }
    }
    const res = new Response(resBody, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
    Object.defineProperty(res, 'url', { value: response.url || url.toString() });
    return res;
  };
  const OpenScript = Object.freeze({ version: '${VERSION}', env, storage, fetch });
  globalThis.OpenScript = OpenScript;
  globalThis.env = env;
  return [OpenScript, env];
})()).catch(error => console.error('[OpenScript] Script failed:', error));
`;

export const buildScriptCode = (script, secrets = {}) => [
  ...(script.requires || []).map(url =>
    `// [OpenScript @require ${url}]\n${script.requireCache?.[url] || ''}`
  ),
  wrapScriptCode(script.code, secrets, script.storageToken),
].join('\n\n');

const download = async url => {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('only HTTP(S) URLs are supported');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

export const refreshRequireCaches = async scripts => {
  const urls = [...new Set(scripts.flatMap(s => s.requires || []))];
  const downloads = new Map(await Promise.all(urls.map(async url => {
    try {
      return [url, { code: await download(url) }];
    } catch (error) {
      return [url, { error: error.message }];
    }
  })));
  const warnings = [];
  const updated = scripts.map(script => {
    const cache = Object.fromEntries((script.requires || []).flatMap(url => {
      const result = downloads.get(url);
      if (result?.code !== undefined) return [[url, result.code]];
      if (script.requireCache?.[url] !== undefined) {
        warnings.push(`${script.name}: using cached ${url} (${result.error})`);
        return [[url, script.requireCache[url]]];
      }
      warnings.push(`${script.name}: could not download ${url} (${result.error})`);
      return [];
    }));
    return { ...script, requireCache: cache };
  });
  return { scripts: updated, warnings };
};

export const syncUserScripts = async ({ refreshRequires = false } = {}) => {
  let [available, scripts, secrets] = await Promise.all([
    isUserScriptsAvailable(), getScripts(), getSecrets(),
  ]);
  let changed = false;
  let missingCache = false;
  scripts = scripts.map(script => {
    const requires = parseMeta(script.code || '').requires;
    const storageToken = script.storageToken || crypto.randomUUID();
    const runAt = getMetaRunAt(script.code || '') || script.runAt || 'document_idle';
    if (requires.some(url => script.requireCache?.[url] === undefined)) missingCache = true;
    if (storageToken === script.storageToken &&
        runAt === script.runAt &&
        JSON.stringify(requires) === JSON.stringify(script.requires || [])) return script;
    changed = true;
    const requireCache = Object.fromEntries(requires.flatMap(url =>
      script.requireCache && Object.hasOwn(script.requireCache, url) ? [[url, script.requireCache[url]]] : []
    ));
    return { ...script, runAt, requires, requireCache, storageToken };
  });

  let warnings = [];
  if (refreshRequires || missingCache) {
    ({ scripts, warnings } = await refreshRequireCaches(scripts));
    changed = true;
  }
  if (changed) await saveScripts(scripts);
  if (!available)
    return { success: false, errors: ['Allow User Scripts is disabled'], warnings };

  const errors = [];
  const activeScripts = scripts.filter(script => {
    if (!script.enabled) return false;
    const missing = (script.requires || []).filter(url => script.requireCache?.[url] === undefined);
    if (!missing.length) return true;
    errors.push(`${script.name}: missing @require cache for ${missing.join(', ')}`);
    return false;
  });

  try {
    const existing = await chrome.userScripts.getScripts();
    if (existing.length) await chrome.userScripts.unregister({ ids: existing.map(s => s.id) });
    if (!activeScripts.length) return { success: !errors.length, errors, warnings };

    await Promise.all(activeScripts.map(script =>
      chrome.userScripts.configureWorld({ worldId: script.id, messaging: true })
    ));
    await chrome.userScripts.register(activeScripts.map(script => ({
      id: script.id,
      matches: (script.matches?.length ? script.matches : ['*://*/*']).map(normalizeMatch),
      runAt: script.runAt || 'document_idle',
      world: 'USER_SCRIPT',
      worldId: script.id,
      js: [{ code: buildScriptCode(script, secrets) }],
    })));
    return { success: !errors.length, errors, warnings };
  } catch (error) {
    console.error('[OpenScript] sync failed:', error);
    return { success: false, errors: [...errors, error.message], warnings };
  }
};
