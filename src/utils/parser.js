// Parse & serialize Tampermonkey metadata blocks

const MULTI_KEYS = new Set(['match', 'include', 'exclude', 'grant', 'require']);

export const parseMeta = code => {
  const block = code.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/)?.[1] || '';
  const meta = { matches: [], grants: [] };

  for (const line of block.split('\n')) {
    const m = line.match(/\/\/\s*@([\w-]+)\s+(.*)/);
    if (!m) continue;
    const [, rawK, rawV] = m;
    const k = rawK.trim().toLowerCase();
    const v = rawV.trim();

    if (k === 'match' || k === 'include') meta.matches.push(v);
    else if (k === 'grant') meta.grants.push(v);
    else if (MULTI_KEYS.has(k)) (meta[k] ??= []).push(v);
    else meta[k] = v;
  }

  return {
    name: meta.name || 'Untitled Script',
    version: meta.version || '1.0.0',
    description: meta.description || '',
    author: meta.author || '',
    matches: meta.matches.length ? meta.matches : ['*://*/*'],
    runAt: (meta['run-at'] || 'document_idle').replace('-', '_'),
    grants: meta.grants,
    icon: meta.icon || '',
    raw: meta,
  };
};

export const normalizeMatch = pattern => {
  let p = pattern.trim();
  if (!p) return '*://*/*';
  if (/^https?:\/\/[^/]+$/.test(p)) p += '/*';
  if (!/^[a-z*]+:\/\//i.test(p)) p = `*://${p}`;
  return p;
};

export const getBoilerplate = (name = 'New Userscript') => 
`// ==UserScript==
// @name         ${name}
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Access secrets via OpenScript.env or env:
    // console.log(OpenScript.env);
})();
`;
