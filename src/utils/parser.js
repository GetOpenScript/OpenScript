// Parse OpenScript's deliberately small metadata format.

const SINGLE_KEYS = new Set(['name', 'version', 'description', 'run-at']);
const MULTI_KEYS = new Set(['match', 'require']);

export const parseMeta = code => {
  const block = code.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/)?.[1] || '';
  const meta = { match: [], require: [] };

  for (const line of block.split('\n')) {
    const m = line.match(/\/\/\s*@([\w-]+)\s+(.*)/);
    if (!m) continue;
    const [, rawK, rawV] = m;
    const k = rawK.trim().toLowerCase();
    const v = rawV.trim();

    if (MULTI_KEYS.has(k)) meta[k].push(v);
    else if (SINGLE_KEYS.has(k)) meta[k] = v;
  }

  return {
    name: meta.name || 'Untitled Script',
    version: meta.version || '',
    description: meta.description || '',
    matches: meta.match.length ? meta.match : ['*://*/*'],
    runAt: (meta['run-at'] || 'document_idle').replace('-', '_'),
    requires: meta.require,
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
// @match        *://*/*
// ==/UserScript==

console.log('Running on', location.hostname);
`;
