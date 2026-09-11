# Privacy Policy for OpenScript

**Last updated:** September 10, 2026

OpenScript is an open-source browser extension designed with a strict privacy-first architecture.

### 1. Data Collection
OpenScript **does not collect, store, transmit, or sell** any personal information, browsing history, analytics, or user telemetry.

### 2. Local & Synced Storage
* **User Scripts:** Script names, code, and configurations are stored solely on your device using Chrome's `chrome.storage.local` API.
* **Script State & Libraries:** Per-script values and downloaded `@require` library source are stored locally with the script that owns them.
* **Environment Secrets:** Variables and API tokens you add are stored via `chrome.storage.sync` and are only synchronized across your own browser sessions using your authenticated Google account. OpenScript has no access to external servers or databases.

OpenScript makes no analytics or telemetry requests. When you save a script containing `@require`, it requests each URL you declared to cache that library. Those hosts receive the ordinary network information associated with a download, such as your IP address.

### 3. Permissions Justification
* **`userScripts`:** Used exclusively to register and execute user-defined scripts inside pages you visit matching your `@match` rules.
* **`storage` & `unlimitedStorage`:** Used to save scripts, per-script state, cached libraries, and synced secrets.
* **Host Permissions (`*://*/*`):** Used to run scripts on configured `@match` URLs and download libraries from user-configured `@require` URLs.

### 4. Third-Party Sharing
OpenScript does not share, transfer, or sell user data to any third party under any circumstances.

### 5. Open Source & Contact
OpenScript is 100% open source. You can inspect the source code or contact the maintainers at:
https://github.com/GetOpenScript/OpenScript
