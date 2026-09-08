import { getScripts, getSecrets } from './storage.js';
import { normalizeMatch } from './parser.js';

export const isUserScriptsAvailable = async () => {
  if (!chrome.userScripts) return false;
  try {
    await chrome.userScripts.getScripts();
    return true;
  } catch {
    return false;
  }
};

export const wrapScriptCode = (code, secrets = {}) => {
  const envInjection = `
// [OpenScript Injected Environment]
(function() {
  const secretsObj = Object.freeze(${JSON.stringify(secrets)});
  const openScriptObj = Object.freeze({
    version: "1.0.0",
    env: secretsObj
  });
  globalThis.OpenScript = openScriptObj;
  globalThis.env = secretsObj;
  globalThis.GM_getValue = (k, def) => (secretsObj[k] ?? def);
})();
var OpenScript = globalThis.OpenScript;
var env = globalThis.env;
var GM_getValue = globalThis.GM_getValue;
`;
  return `${envInjection}\n${code}`;
};

export const syncUserScripts = async () => {
  if (!await isUserScriptsAvailable()) return false;

  const [scripts, secrets] = await Promise.all([getScripts(), getSecrets()]);
  const activeScripts = scripts.filter(s => s.enabled);

  try {
    const existing = await chrome.userScripts.getScripts();
    if (existing.length) await chrome.userScripts.unregister({ ids: existing.map(s => s.id) });

    if (!activeScripts.length) return true;

    const toRegister = activeScripts.map(s => ({
      id: s.id,
      matches: (s.matches?.length ? s.matches : ['*://*/*']).map(normalizeMatch),
      runAt: s.runAt || 'document_idle',
      js: [{ code: wrapScriptCode(s.code, secrets) }],
    }));

    await chrome.userScripts.register(toRegister);
    return true;
  } catch (err) {
    console.error('[OpenScript] sync failed:', err);
    return false;
  }
};
