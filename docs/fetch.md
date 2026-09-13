# Cross-Origin Fetch (`OpenScript.fetch`)

`OpenScript.fetch(url, options)` allows user scripts to perform cross-origin HTTP(S) requests that bypass webpage CORS (Cross-Origin Resource Sharing) and page CSP (Content Security Policy) restrictions.

Requests are routed through OpenScript's privileged background service worker using extension host permissions (`*://*/*`), and return a standard, native browser `Response` instance.

---

## Why use `OpenScript.fetch`?

When a user script runs on a website (such as `youtube.com` or `github.com`), standard `window.fetch()` calls are subject to the page's security context:
- External endpoints that lack CORS headers (`Access-Control-Allow-Origin`) cannot be read.
- Webpage CSP (`connect-src`) can block outbound network calls.
- Third-party cookies cannot be attached to cross-origin requests.

`OpenScript.fetch` solves all of these limitations without requiring legacy, callback-heavy APIs like `GM_xmlhttpRequest`.

---

## Syntax

```javascript
const response = await OpenScript.fetch(resource, options);
```

### Parameters

- **`resource`** *(string | URL)*: The target URL to fetch.
- **`options`** *(object, optional)*: Standard fetch options:
  - `method` *(string)*: HTTP method, e.g. `'GET'`, `'POST'`, `'PUT'`, `'DELETE'`. Defaults to `'GET'`.
  - `headers` *(object | Headers)*: Request headers as key-value pairs or a `Headers` instance.
  - `body` *(string | ArrayBuffer | Uint8Array)*: Body payload for `POST` / `PUT` requests.
  - `credentials` *(string)*: Set to `'include'` to attach browser session cookies for the target domain. Defaults to `'same-origin'`.
  - `cache`, `redirect`, and other standard fetch options.

### Return Value

Returns a `Promise` resolving to a native browser **[`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)** instance.

Supported methods and properties:
- `res.ok` *(boolean)*: `true` if status code is in the 200–299 range.
- `res.status` *(number)*: HTTP status code (e.g. `200`, `404`).
- `res.statusText` *(string)*: Status message (e.g. `'OK'`).
- `res.headers` *(Headers)*: Map of response headers (`res.headers.get('content-type')`).
- `res.url` *(string)*: Final URL after redirects.
- `await res.json()`: Parses response body as JSON.
- `await res.text()`: Reads response body as text string.
- `await res.arrayBuffer()`: Reads raw binary data.
- `await res.blob()`: Reads response as a `Blob`.

---

## Examples

### 1. Basic JSON Request (Bypassing CORS)

```javascript
// ==UserScript==
// @name         Reddit Search on YouTube
// @match        https://www.youtube.com/*
// ==/UserScript==

const res = await OpenScript.fetch('https://www.reddit.com/search.json?q=OpenScript');
if (!res.ok) {
  console.error(`HTTP error: ${res.status}`);
  return;
}

const data = await res.json();
console.log('Reddit posts:', data.data.children);
```

### 2. Authenticated Request using Session Cookies

Passing `credentials: 'include'` forwards the browser's existing cookies for the destination host, enabling interactions with services where the user is already logged in:

```javascript
// Check current Reddit user session without OAuth
const res = await OpenScript.fetch('https://www.reddit.com/api/me.json', {
  credentials: 'include',
});

if (res.ok) {
  const me = await res.json();
  console.log('Logged in as:', me.data.name);
}
```

### 3. POST Request with JSON Body

```javascript
const res = await OpenScript.fetch('https://api.example.com/items', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OpenScript.env.API_KEY}`,
  },
  body: JSON.stringify({ name: 'New Item' }),
});

const result = await res.json();
```

### 4. Downloading Binary Data / Blobs

```javascript
const res = await OpenScript.fetch('https://example.com/image.png');
const blob = await res.blob();
const objectUrl = URL.createObjectURL(blob);

const img = document.createElement('img');
img.src = objectUrl;
document.body.append(img);
```

### 5. Error Handling

Like native `fetch()`, network failures (offline, connection refused, DNS errors) reject with a `TypeError`. HTTP errors (like 404 or 500) resolve normally and should be checked with `res.ok`:

```javascript
try {
  const res = await OpenScript.fetch('https://api.example.com/data');
  if (!res.ok) throw new Error(`Server returned status ${res.status}`);
  const data = await res.json();
} catch (err) {
  if (err instanceof TypeError) {
    console.error('Network failure:', err.message);
  } else {
    console.error('API error:', err.message);
  }
}
```
