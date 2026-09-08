# Privacy Policy for OpenScript

**Last updated:** September 8, 2026

OpenScript is an open-source browser extension designed with a strict privacy-first architecture.

### 1. Data Collection
OpenScript **does not collect, store, transmit, or sell** any personal information, browsing history, analytics, or user telemetry.

### 2. Local & Synced Storage
* **User Scripts:** Script names, code, and configurations are stored solely on your device using Chrome's `chrome.storage.local` API.
* **Environment Secrets:** Variables and API tokens you add are stored via `chrome.storage.sync` and are only synchronized across your own browser sessions using your authenticated Google account. OpenScript has no access to external servers or databases.

### 3. Permissions Justification
* **`userScripts`:** Used exclusively to register and execute user-defined scripts inside pages you visit matching your `@match` rules.
* **`storage` & `unlimitedStorage`:** Used exclusively to save your scripts and secrets on your local machine.
* **Host Permissions (`*://*/*`):** Used solely to allow scripts to run on URLs specified in the user scripts you configure.

### 4. Third-Party Sharing
OpenScript does not share, transfer, or sell user data to any third party under any circumstances.

### 5. Open Source & Contact
OpenScript is 100% open source. You can inspect the source code or contact the maintainers at:
https://github.com/GetOpenScript/OpenScript
