# OpenScript

A lightweight, modern user script manager built for Chrome Manifest V3 using the native `chrome.userScripts` API.

---

## ⚡ Prerequisites

To run user scripts in Chrome MV3:
1. Open `chrome://extensions` in your browser.
2. Click **Details** on the **OpenScript** extension card.
3. Enable the **"Allow User Scripts"** toggle.

---

## 📖 Writing Scripts Tutorial

OpenScript uses standard Tampermonkey-compatible metadata headers with built-in secret injection.

### 1. The Metadata Block

Every user script begins with a `// ==UserScript==` block that tells OpenScript when and where to run:

```javascript
// ==UserScript==
// @name         GitHub Notification Cleaner
// @version      1.0.0
// @description  Hides read notifications automatically
// @author       YourName
// @match        https://github.com/*
// @run-at       document_idle
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  console.log('OpenScript running on GitHub!');
})();
```

#### Supported Header Directives

| Directive | Description | Example |
| :--- | :--- | :--- |
| `@name` | Script title shown in OpenScript popup list | `@name My Custom Tool` |
| `@version` | Version badge displayed in popup list | `@version 1.2.0` |
| `@description` | Summary shown under the script title | `@description Auto-clicks accept buttons` |
| `@author` | Author metadata | `@author Alice` |
| `@match` / `@include` | URL patterns where script runs (supports multiple) | `@match https://*.example.com/*` |
| `@run-at` | Injection timing: `document_idle` (default), `document_start`, `document_end` | `@run-at document_start` |
| `@grant` | Compatibility header (e.g. `none`) | `@grant none` |

> **Note on `@match` normalization:** OpenScript automatically normalizes bare URLs (e.g., `github.com/*` becomes `*://github.com/*` and `https://github.com` becomes `https://github.com/*`).

---

### 2. Execution Timing (`@run-at`)

Control when your script executes relative to page lifecycle:

* **`document_idle` (Default):** Runs after the page DOM is fully built and subresources have finished loading. Best for DOM manipulation and button clicks.
* **`document_start`:** Runs before any DOM elements are constructed or external page scripts execute. Best for early theme injection, ad/tracker blockers, or prototype overrides.
* **`document_end`:** Runs right as the DOM content is parsed (`DOMContentLoaded`), before images and stylesheets finish loading.

*(Both hyphenated `document-idle` and underscore `document_idle` formats are supported).*

---

### 3. Using Synced Secrets & Environment Variables

OpenScript allows you to store sensitive API tokens or passwords in the **Secrets** tab. Secrets are synced across your devices via `chrome.storage.sync` and injected into every active user script.

#### Accessing Secrets in Code

You can read secrets using any of these 3 equivalent syntaxes:

```javascript
// 1. Direct OpenScript namespace
const token = OpenScript.env.GH_PAT;

// 2. Shorthand env global
const token = env.GH_PAT;

// 3. Standard Tampermonkey GM_getValue polyfill
const token = GM_getValue('GH_PAT', 'default_value');
```

#### Complete Example: GitHub API Fetcher with Secrets

```javascript
// ==UserScript==
// @name         GitHub Repo Stats
// @version      1.0.0
// @description  Fetches repository star count with personal token
// @match        https://github.com/*
// @run-at       document_idle
// ==/UserScript==

(async function() {
  'use strict';

  // Retrieve secret saved in OpenScript "Secrets" tab
  const token = env.GH_PAT;
  if (!token) {
    console.warn('[OpenScript] Please configure GH_PAT in OpenScript Secrets tab.');
    return;
  }

  const [, owner, repo] = location.pathname.split('/');
  if (!owner || !repo) return;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(`[OpenScript] ${data.full_name} has ${data.stargazers_count} stars!`);
})();
```

---

### 4. Boilerplate Template

When you click **+ New** in the extension popup, OpenScript gives you this clean starter template:

```javascript
// ==UserScript==
// @name         New Userscript
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
```

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run unit tests
npm test

# Generate icons from master v2 logo
npm run build:icons

# Build and package Chrome Web Store zip
npm run zip
```

---

## 🔒 Privacy

OpenScript does not track users, log data, or contact external servers. All user scripts are stored locally on your machine. See our [Privacy Policy](PRIVACY.md).
