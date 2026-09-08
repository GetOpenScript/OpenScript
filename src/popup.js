import { getScripts, saveScripts, getSecrets, saveSecrets } from './utils/storage.js';
import { parseMeta, getBoilerplate } from './utils/parser.js';
import { isUserScriptsAvailable, syncUserScripts } from './utils/userScripts.js';
import { renderIcons, icon } from './utils/icons.js';

// Application State
const state = {
  tab: 'list', // 'list' | 'editor' | 'secrets'
  editingId: null,
  scripts: [],
  secrets: {},
  revealedSecrets: new Set(),
  userScriptsReady: true,
  search: '',
};

const $ = sel => document.querySelector(sel);
const app = $('#app');

// Toast feedback helper
let toastTimeout;
const showToast = (msg, isErr = false) => {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `fixed bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded shadow-lg transition-all z-50 font-medium ${
    isErr ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
  }`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add('hidden'), 2200);
};

// Initialize & Load
const init = async () => {
  state.userScriptsReady = await isUserScriptsAvailable();
  const [scripts, secrets] = await Promise.all([getScripts(), getSecrets()]);
  state.scripts = scripts;
  state.secrets = secrets;
  render();
};

// Actions
const setTab = (tab, editingId = null) => {
  state.tab = tab;
  state.editingId = editingId;
  render();
};

const toggleScript = async id => {
  const s = state.scripts.find(x => x.id === id);
  if (!s) return;
  s.enabled = !s.enabled;
  await saveScripts(state.scripts);
  await syncUserScripts();
  render();
  showToast(`Script ${s.enabled ? 'enabled' : 'disabled'}`);
};

const deleteScript = async id => {
  if (!confirm('Delete this user script?')) return;
  state.scripts = state.scripts.filter(s => s.id !== id);
  await saveScripts(state.scripts);
  await syncUserScripts();
  render();
  showToast('Script deleted');
};

const saveCurrentScript = async () => {
  const textarea = $('#editor-code');
  if (!textarea) return;
  const code = textarea.value.trim();
  if (!code) return showToast('Script cannot be empty', true);

  const meta = parseMeta(code);
  const existing = state.scripts.find(s => s.id === state.editingId);
  const scriptObj = {
    id: state.editingId || `script_${Date.now()}`,
    name: meta.name,
    version: meta.version,
    description: meta.description,
    matches: meta.matches,
    runAt: $('#run-at-select')?.value || meta.runAt || 'document_idle',
    code,
    enabled: existing ? existing.enabled : true,
    updatedAt: Date.now(),
  };

  state.scripts = state.editingId
    ? state.scripts.map(s => (s.id === state.editingId ? scriptObj : s))
    : [scriptObj, ...state.scripts];

  await saveScripts(state.scripts);
  await syncUserScripts();
  setTab('list');
  showToast('Script saved & synced!');
};

const addSecret = async (key, val) => {
  const k = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const v = val.trim();
  if (!k) return showToast('Enter variable name', true);
  state.secrets[k] = v;
  await saveSecrets(state.secrets);
  await syncUserScripts();
  render();
  showToast(`Saved secret: ${k}`);
};

const removeSecret = async k => {
  delete state.secrets[k];
  state.revealedSecrets.delete(k);
  await saveSecrets(state.secrets);
  await syncUserScripts();
  render();
  showToast(`Removed secret: ${k}`);
};

// UI Templates
const renderHeader = () => `
  <header class="bg-navy-900 border-b border-navy-700/60 px-3 py-2 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-2 cursor-pointer" id="nav-brand">
      <img src="/icons/icon-16.png" class="w-4 h-4 rounded-sm" />
      <span class="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
        OpenScript
        <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-navy-800 text-sky-400 border border-navy-700">1.0</span>
      </span>
    </div>
    <nav class="flex items-center gap-1.5 text-xs font-medium">
      <button id="nav-list" class="px-2.5 py-1 rounded transition-colors ${
        state.tab === 'list' ? 'bg-navy-700 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-navy-800'
      }">
        Scripts <span class="text-[10px] opacity-75">(${state.scripts.length})</span>
      </button>
      <button id="nav-secrets" class="px-2.5 py-1 rounded transition-colors ${
        state.tab === 'secrets' ? 'bg-navy-700 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-navy-800'
      }">
        Secrets <span class="text-[10px] opacity-75">(${Object.keys(state.secrets).length})</span>
      </button>
      <button id="nav-new" class="ml-1 text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 transition-colors flex items-center gap-1">
        ${icon('Plus', 'w-3 h-3')} New
      </button>
    </nav>
  </header>
`;

const renderBanner = () => state.userScriptsReady ? '' : `
  <div class="bg-amber-500/15 border-b border-amber-500/30 px-3 py-2 flex items-center justify-between text-amber-300 text-xs shrink-0 gap-2">
    <div class="flex items-center gap-1.5 min-w-0">
      ${icon('AlertTriangle', 'w-4 h-4 text-amber-400 shrink-0')}
      <span class="leading-tight">
        Enable <strong class="text-amber-200">"Allow User Scripts"</strong> in extension details to run scripts.
      </span>
    </div>
    <button id="btn-open-settings" class="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 px-2 py-1 rounded text-[11px] font-medium shrink-0 flex items-center gap-1 transition-colors cursor-pointer">
      ${icon('ExternalLink', 'w-3 h-3')} Details
    </button>
  </div>
`;

const renderScriptList = () => {
  const filtered = state.scripts.filter(s => 
    !state.search || 
    s.name.toLowerCase().includes(state.search.toLowerCase()) ||
    s.matches?.some(m => m.toLowerCase().includes(state.search.toLowerCase()))
  );

  return `
    <div class="flex flex-col flex-1 overflow-hidden bg-navy-950">
      <div class="p-2.5 border-b border-navy-800/80 flex items-center gap-2 shrink-0">
        <input 
          id="script-search" 
          type="text" 
          placeholder="Filter scripts or matches..." 
          value="${state.search}"
          class="bg-navy-900 border border-navy-800 text-slate-200 placeholder-slate-500 text-xs px-2.5 py-1 rounded w-full focus:outline-none focus:border-navy-600 font-mono"
        />
      </div>
      <div class="flex-1 overflow-y-auto p-2.5 space-y-2">
        ${filtered.length ? filtered.map(s => `
          <div class="bg-navy-900/90 border border-navy-800 hover:border-navy-700/80 rounded p-2.5 transition-all flex flex-col gap-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <button 
                  data-action="toggle" 
                  data-id="${s.id}" 
                  class="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    s.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }">
                  <span class="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    s.enabled ? 'translate-x-3' : 'translate-x-0'
                  }"></span>
                </button>
                <span class="font-semibold text-xs text-slate-100 truncate cursor-pointer hover:text-sky-300" data-action="edit" data-id="${s.id}">
                  ${s.name}
                </span>
                <span class="text-[10px] font-mono text-slate-400 bg-navy-800 px-1 rounded border border-navy-700/60 shrink-0">
                  v${s.version || '1.0'}
                </span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button data-action="edit" data-id="${s.id}" class="p-1 hover:bg-navy-800 rounded text-slate-400 hover:text-sky-400" title="Edit Script">
                  ${icon('Pencil', 'w-3.5 h-3.5')}
                </button>
                <button data-action="delete" data-id="${s.id}" class="p-1 hover:bg-navy-800 rounded text-slate-400 hover:text-red-400" title="Delete Script">
                  ${icon('Trash2', 'w-3.5 h-3.5')}
                </button>
              </div>
            </div>
            ${s.description ? `<p class="text-[11px] text-slate-400 line-clamp-1">${s.description}</p>` : ''}
            <div class="flex flex-wrap gap-1 mt-0.5">
              ${(s.matches || ['*://*/*']).slice(0, 3).map(m => `
                <span class="text-[10px] font-mono px-1.5 py-0.2 bg-navy-950 text-sky-300 border border-navy-800 rounded">
                  ${m}
                </span>
              `).join('')}
              ${(s.matches?.length > 3) ? `<span class="text-[10px] font-mono text-slate-400">+${s.matches.length - 3}</span>` : ''}
            </div>
          </div>
        `).join('') : `
          <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            ${icon('FileCode', 'w-10 h-10 text-navy-700 mb-2')}
            <p class="text-xs font-medium text-slate-300">No user scripts found</p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-[240px]">Create a new script or import a Tampermonkey script to get started.</p>
            <button id="btn-empty-new" class="mt-4 bg-white text-navy-950 hover:bg-slate-100 font-semibold text-xs px-3.5 py-1.5 rounded border border-slate-300 shadow-sm cursor-pointer">
              + New Script
            </button>
          </div>
        `}
      </div>
      <footer class="bg-navy-900 border-t border-navy-800/80 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-mono">
        <span>${state.scripts.filter(s => s.enabled).length} active / ${state.scripts.length} total</span>
        <span>Storage: chrome.storage.local</span>
      </footer>
    </div>
  `;
};

const renderEditor = () => {
  const script = state.scripts.find(s => s.id === state.editingId);
  const code = script ? script.code : getBoilerplate();
  const runAt = script?.runAt || 'document_idle';

  return `
    <div class="flex flex-col flex-1 overflow-hidden bg-navy-950">
      <!-- Editor Textarea Area styled like reference image -->
      <div class="flex-1 p-2 bg-navy-900 flex flex-col min-h-0">
        <textarea
          id="editor-code"
          spellcheck="false"
          placeholder="// ==UserScript==&#10;// Paste or write script here..."
          class="flex-1 w-full p-2.5 bg-[#eef1f5] text-slate-900 font-mono text-[11px] leading-relaxed rounded border border-navy-800 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none overflow-y-auto"
        >${code}</textarea>
      </div>

      <!-- Action Bar styled after reference image -->
      <div class="bg-navy-900 border-t border-navy-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-1.5">
          <button id="btn-save-script" class="bg-white hover:bg-slate-100 text-navy-950 font-semibold text-xs px-3 py-1 rounded border border-slate-300 shadow-sm cursor-pointer transition-colors">
            save script
          </button>
          <button id="btn-cancel-edit" class="bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs px-2.5 py-1 rounded border border-navy-700 cursor-pointer transition-colors">
            cancel
          </button>
          <button id="btn-reset-boilerplate" class="bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs px-2 py-1 rounded border border-navy-700 cursor-pointer transition-colors" title="Insert default template">
            template
          </button>
        </div>

        <div class="flex items-center gap-1.5">
          <label class="text-[10px] text-slate-400 font-mono">run-at:</label>
          <select id="run-at-select" class="bg-navy-950 border border-navy-700 text-slate-200 text-[11px] font-mono rounded px-1.5 py-1 focus:outline-none">
            <option value="document_idle" ${runAt === 'document_idle' ? 'selected' : ''}>document_idle</option>
            <option value="document_start" ${runAt === 'document_start' ? 'selected' : ''}>document_start</option>
            <option value="document_end" ${runAt === 'document_end' ? 'selected' : ''}>document_end</option>
          </select>
        </div>
      </div>

      <!-- Notice Bar matching reference image -->
      <footer class="bg-navy-950 border-t border-navy-800/80 px-3 py-1 text-[10px] text-slate-400 font-mono shrink-0">
        notice: scripts run on matched URLs with synced secrets injected.
      </footer>
    </div>
  `;
};

const renderSecrets = () => {
  const keys = Object.keys(state.secrets);

  return `
    <div class="flex flex-col flex-1 overflow-hidden bg-navy-950">
      <div class="p-3 border-b border-navy-800/80 bg-navy-900/60 shrink-0">
        <h2 class="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
          ${icon('Key', 'w-3.5 h-3.5 text-sky-400')} Synced Secrets / Environment Variables
        </h2>
        <p class="text-[11px] text-slate-400 leading-tight">
          Secrets are saved to <span class="text-sky-300 font-mono">chrome.storage.sync</span> and available across all devices.
        </p>

        <!-- Add Secret Form -->
        <div class="mt-2.5 flex items-center gap-1.5">
          <input 
            id="new-secret-key" 
            type="text" 
            placeholder="KEY (e.g. API_KEY)" 
            class="w-1/3 bg-navy-950 border border-navy-700 text-slate-100 text-xs px-2 py-1 rounded font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <input 
            id="new-secret-val" 
            type="text" 
            placeholder="Value..." 
            class="flex-1 bg-navy-950 border border-navy-700 text-slate-100 text-xs px-2 py-1 rounded font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button id="btn-add-secret" class="bg-white hover:bg-slate-100 text-navy-950 font-semibold text-xs px-3 py-1 rounded border border-slate-300 shadow-sm shrink-0 cursor-pointer">
            + Add
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2.5 space-y-2">
        ${keys.length ? keys.map(k => {
          const isRevealed = state.revealedSecrets.has(k);
          const val = state.secrets[k];
          return `
            <div class="bg-navy-900 border border-navy-800 rounded p-2 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="font-mono font-semibold text-xs text-sky-300 shrink-0">${k}</span>
                <span class="text-slate-500 text-xs shrink-0">=</span>
                <span class="font-mono text-xs text-slate-300 truncate select-all">
                  ${isRevealed ? val : '••••••••••••'}
                </span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button data-action="toggle-secret" data-key="${k}" class="p-1 hover:bg-navy-800 rounded text-slate-400 hover:text-slate-200" title="${isRevealed ? 'Hide' : 'Reveal'}">
                  ${icon(isRevealed ? 'EyeOff' : 'Eye', 'w-3.5 h-3.5')}
                </button>
                <button data-action="copy-secret" data-key="${k}" class="p-1 hover:bg-navy-800 rounded text-slate-400 hover:text-sky-400" title="Copy Value">
                  ${icon('Copy', 'w-3.5 h-3.5')}
                </button>
                <button data-action="delete-secret" data-key="${k}" class="p-1 hover:bg-navy-800 rounded text-slate-400 hover:text-red-400" title="Delete Secret">
                  ${icon('Trash2', 'w-3.5 h-3.5')}
                </button>
              </div>
            </div>
          `;
        }).join('') : `
          <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            ${icon('Key', 'w-8 h-8 text-navy-700 mb-2')}
            <p class="text-xs font-medium text-slate-300">No secrets configured</p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-[240px]">Add API tokens or credentials here to securely access them in your user scripts.</p>
          </div>
        `}

        <div class="mt-4 p-2.5 bg-navy-900/40 border border-navy-800/80 rounded">
          <p class="text-[11px] text-slate-400 font-semibold mb-1">Code usage in scripts:</p>
          <pre class="bg-navy-950 p-2 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto">const token = OpenScript.env.MY_API_KEY;
// or: const token = env.MY_API_KEY;
// or: const token = GM_getValue('MY_API_KEY');</pre>
        </div>
      </div>

      <footer class="bg-navy-900 border-t border-navy-800/80 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-mono">
        <span>${keys.length} secrets stored</span>
        <span>Storage: chrome.storage.sync</span>
      </footer>
    </div>
  `;
};

// Main Render
const render = () => {
  let content = '';
  if (state.tab === 'list') content = renderScriptList();
  else if (state.tab === 'editor') content = renderEditor();
  else if (state.tab === 'secrets') content = renderSecrets();

  app.innerHTML = `
    ${renderHeader()}
    ${renderBanner()}
    ${content}
    <div id="toast" class="hidden"></div>
  `;

  renderIcons();
  bindEvents();
};

// Event Bindings
const bindEvents = () => {
  // Navigation
  $('#nav-brand')?.addEventListener('click', () => setTab('list'));
  $('#nav-list')?.addEventListener('click', () => setTab('list'));
  $('#nav-secrets')?.addEventListener('click', () => setTab('secrets'));
  $('#nav-new')?.addEventListener('click', () => setTab('editor', null));
  $('#btn-empty-new')?.addEventListener('click', () => setTab('editor', null));

  // Banner settings button
  $('#btn-open-settings')?.addEventListener('click', async () => {
    const extUrl = `chrome://extensions/?id=${chrome.runtime.id}`;
    try {
      await chrome.tabs.create({ url: extUrl });
    } catch {
      await navigator.clipboard.writeText(extUrl);
      showToast('Copied extension URL to clipboard!');
    }
  });

  // Search
  const searchInput = $('#script-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.search = e.target.value;
      // Re-render only script list body or re-render
      render();
      const el = $('#script-search');
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });
  }

  // Script List Actions (delegated)
  app.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleScript(btn.dataset.id);
    });
  });

  app.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => setTab('editor', btn.dataset.id));
  });

  app.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteScript(btn.dataset.id);
    });
  });

  // Editor Actions
  $('#btn-save-script')?.addEventListener('click', saveCurrentScript);
  $('#btn-cancel-edit')?.addEventListener('click', () => setTab('list'));
  $('#btn-reset-boilerplate')?.addEventListener('click', () => {
    const el = $('#editor-code');
    if (el && confirm('Reset code to default boilerplate?')) el.value = getBoilerplate();
  });

  // Tab key indent in editor
  const textarea = $('#editor-code');
  if (textarea) {
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    });
  }

  // Secrets Actions
  $('#btn-add-secret')?.addEventListener('click', () => {
    const k = $('#new-secret-key')?.value || '';
    const v = $('#new-secret-val')?.value || '';
    addSecret(k, v);
  });

  app.querySelectorAll('[data-action="toggle-secret"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      if (state.revealedSecrets.has(k)) state.revealedSecrets.delete(k);
      else state.revealedSecrets.add(k);
      render();
    });
  });

  app.querySelectorAll('[data-action="copy-secret"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = state.secrets[btn.dataset.key] || '';
      navigator.clipboard.writeText(val);
      showToast('Copied to clipboard');
    });
  });

  app.querySelectorAll('[data-action="delete-secret"]').forEach(btn => {
    btn.addEventListener('click', () => removeSecret(btn.dataset.key));
  });
};

// Start
init();

// Auto re-check when returning to popup after toggling setting
window.addEventListener('focus', async () => {
  const ready = await isUserScriptsAvailable();
  if (ready !== state.userScriptsReady) {
    state.userScriptsReady = ready;
    if (ready) await syncUserScripts();
    render();
  }
});
