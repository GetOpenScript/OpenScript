const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const toBase64 = buffer => {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.byteLength)));
  }
  return btoa(bin);
};

export const runScriptFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  const { status, statusText } = res;
  const headers = [...res.headers.entries()];
  if (NULL_BODY_STATUSES.has(status)) {
    return { status, statusText, headers, url: res.url, body: null };
  }
  if (['arraybuffer', 'blob'].includes(options?.responseType)) {
    const buffer = await res.arrayBuffer();
    return { status, statusText, headers, url: res.url, base64: toBase64(buffer) };
  }
  const body = await res.text();
  return { status, statusText, headers, url: res.url, body };
};
