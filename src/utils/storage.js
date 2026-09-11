// Storage utilities for OpenScript (local for scripts, sync for secrets)

const SCRIPT_STORAGE_PREFIX = 'storage_';
const scriptStorageKey = (id, key) => `${SCRIPT_STORAGE_PREFIX}${id}_${key}`;
const assertKey = key => {
  if (typeof key !== 'string' || !key) throw new TypeError('Storage keys must be non-empty strings');
};

export const getScripts = async () => 
  (await chrome.storage.local.get('scripts'))?.scripts || [];

export const saveScripts = scripts => 
  chrome.storage.local.set({ scripts });

export const getSecrets = async () => 
  (await chrome.storage.sync.get('secrets'))?.secrets || {};

export const saveSecrets = secrets => 
  chrome.storage.sync.set({ secrets });

export const runScriptStorageOperation = async (token, operation, key, value) => {
  const script = (await getScripts()).find(s => s.storageToken === token);
  if (!script) throw new Error('Invalid script storage token');

  const prefix = scriptStorageKey(script.id, '');
  if (operation === 'list') {
    const values = await chrome.storage.local.get(null);
    return { keys: Object.keys(values).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)) };
  }

  assertKey(key);
  const storageKey = scriptStorageKey(script.id, key);
  if (operation === 'set') {
    await chrome.storage.local.set({ [storageKey]: value });
    return {};
  }
  if (operation === 'get') {
    const values = await chrome.storage.local.get(storageKey);
    return { found: Object.hasOwn(values, storageKey), value: values[storageKey] };
  }
  if (operation === 'delete') {
    await chrome.storage.local.remove(storageKey);
    return {};
  }
  throw new Error(`Unknown storage operation: ${operation}`);
};

export const garbageCollectScriptStorage = async scriptIds => {
  const prefixes = scriptIds.map(id => scriptStorageKey(id, ''));
  const values = await chrome.storage.local.get(null);
  const orphaned = Object.keys(values).filter(key =>
    key.startsWith(SCRIPT_STORAGE_PREFIX) && !prefixes.some(prefix => key.startsWith(prefix))
  );
  if (orphaned.length) await chrome.storage.local.remove(orphaned);
  return orphaned;
};
