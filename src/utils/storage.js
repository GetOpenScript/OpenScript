// Storage utilities for OpenScript (local for scripts, sync for secrets)

export const getScripts = async () => 
  (await chrome.storage.local.get('scripts'))?.scripts || [];

export const saveScripts = scripts => 
  chrome.storage.local.set({ scripts });

export const getSecrets = async () => 
  (await chrome.storage.sync.get('secrets'))?.secrets || {};

export const saveSecrets = secrets => 
  chrome.storage.sync.set({ secrets });
