import { syncUserScripts } from './utils/userScripts.js';

chrome.runtime.onInstalled.addListener(() => {
  syncUserScripts();
});

chrome.runtime.onStartup.addListener(() => {
  syncUserScripts();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SYNC_SCRIPTS') {
    syncUserScripts().then(success => sendResponse({ success }));
    return true;
  }
});
