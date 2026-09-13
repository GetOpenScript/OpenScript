import { syncUserScripts } from './utils/userScripts.js';
import { runScriptStorageOperation } from './utils/storage.js';
import { runScriptFetch } from './utils/fetch.js';

let syncQueue = Promise.resolve();
const safelySync = async options => {
  try {
    return await syncUserScripts(options);
  } catch (error) {
    console.error('[OpenScript] sync failed:', error);
    return { success: false, errors: [error.message], warnings: [] };
  }
};
const queueSync = options => syncQueue = syncQueue.then(
  () => safelySync(options), () => safelySync(options),
);

chrome.runtime.onInstalled.addListener(() => {
  queueSync();
});

chrome.runtime.onStartup.addListener(() => {
  queueSync();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SYNC_SCRIPTS') {
    queueSync({ refreshRequires: !!msg.refreshRequires }).then(sendResponse);
    return true;
  }
});

chrome.runtime.onUserScriptMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'OPEN_SCRIPT_STORAGE') {
    runScriptStorageOperation(msg.token, msg.operation, msg.key, msg.value)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (msg?.type === 'OPEN_SCRIPT_FETCH') {
    runScriptFetch(msg.url, msg.options)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
