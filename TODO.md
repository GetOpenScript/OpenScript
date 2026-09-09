# OpenScript Architecture & Roadmap (TODO)

## 🎯 Vision & Philosophy
OpenScript is built for personal control, security, and developer ergonomics—not legacy compatibility. We are intentionally divorcing from Greasemonkey/Tampermonkey conventions and Greasy Fork baggage in favor of a clean, modern, zero-overhead script runner for Chrome MV3.

---

## 1. Implement `OpenScript.storage.*` (Stateful Scripts)
Add native, per-script key-value persistence so scripts can retain state, caches, counters, and UI toggle preferences across page reloads and browser restarts without relying on in-memory `Map`s.

### Proposed API
```javascript
await OpenScript.storage.set('repo_cache', { size: 1024 });
const cached = await OpenScript.storage.get('repo_cache'); // returns undefined if not found
await OpenScript.storage.delete('repo_cache');
const allKeys = await OpenScript.storage.list();
```

### Implementation Details
* Store values under `chrome.storage.local`.
* Prefix keys by script ID (`storage_${scriptId}_${key}`) to guarantee strict isolation between scripts.
* Expose via background worker messaging or direct bridge in script injection context.
* Universally available to all scripts without requiring any permission gates.

---

## 2. Eliminate Legacy Metadata Bloat (`@grant`, `@namespace`)
Tampermonkey required headers designed for third-party security audits and sandboxing hacks from 15 years ago. For OpenScript, these are purely friction.

### TODO:
- [ ] **Remove `@grant`:** Eliminate `@grant` from the parser, template boilerplate, and docs. Since OpenScript is designed for personal scripts, artificial permission gating is unnecessary red tape. All built-in APIs (`env`, `storage`) should be available out of the box.
- [ ] **Remove `@namespace`:** Unnecessary metadata relic; completely ignore and omit.
- [ ] **Minimalist Header Standard:** Retain only the essentials:
  - `@name` (UI display in popup)
  - `@match` (URL injection pattern for Chrome)
  - `@run-at` (`document_idle` | `document_start` | `document_end`)
  - `@description` *(Optional)*

---

## 3. Drop Ritualistic Wrappers & Enable Native Async
Forcing scripts to start with `(function() { 'use strict'; })();` is ugly, redundant, and visually noisy.

### Proposed Improvement:
* Automatically wrap user code behind the scenes inside `wrapScriptCode`:
  ```javascript
  (async function() {
    'use strict';
    // User's clean script code runs here
  })();
  ```

### Benefits:
- **Top-Level `await` Everywhere:** Users can write `const res = await fetch(...)` directly at the root of the script without nesting inside an async function.
- **Zero Boilerplate:** The default new script template drops down to:
  ```javascript
  // ==UserScript==
  // @name         My Script
  // @match        *://*/*
  // ==/UserScript==

  console.log('Running on', location.hostname);
  ```
- **Scope Isolation:** Variables (`const`, `let`, `var`) won't collide across multiple user scripts on the same page.
- **Clean Early Exits:** Top-level `return;` continues to work cleanly to halt execution early when needed.

---

## 4. Purge `GM_*` Polyfills
- [ ] Remove `GM_getValue` polyfill from `src/utils/userScripts.js`.
- [ ] Transition strictly to the modern, canonical OpenScript namespace:
  - `OpenScript.env.KEY` / `env.KEY` (for synced credentials)
  - `OpenScript.storage.*` (for persistent per-script state)
- [ ] Clean up tests and examples to remove references to `GM_*`.

---

## 5. External Libraries: Bundling via `@require`
Instead of relying on dynamic `import()` (which is blocked by website Content Security Policies on hardened domains like GitHub), support `@require <url>`.

### Implementation:
- Parser extracts `@require <url>` directives from metadata.
- When saving/syncing scripts, OpenScript fetches external scripts (e.g. SweetAlert2, UI helpers) in the background.
- Downloaded libraries are prepended directly into the user script bundle inside Chrome's isolated `USER_SCRIPT` world.
- Bypasses target website CSP restrictions completely and works offline.
