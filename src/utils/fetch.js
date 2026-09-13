const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

export const runScriptFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  const { status, statusText } = res;
  const headers = [...res.headers.entries()];
  const body = NULL_BODY_STATUSES.has(status) ? null : await res.arrayBuffer();
  return { status, statusText, headers, url: res.url, body };
};
