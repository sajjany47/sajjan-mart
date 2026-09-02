'use client';

const AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/signup',
]);

let refreshPromise: Promise<boolean> | null = null;
let installed = false;

function getRequestPath(input: RequestInfo | URL) {
  const rawUrl = input instanceof Request ? input.url : input.toString();
  return new URL(rawUrl, window.location.origin).pathname;
}

function shouldRefresh(input: RequestInfo | URL) {
  return getRequestPath(input).startsWith('/api/') && !AUTH_PATHS.has(getRequestPath(input));
}

async function refreshAccessToken(nativeFetch: typeof fetch) {
  if (!refreshPromise) {
    refreshPromise = nativeFetch('/api/auth/refresh', { method: 'POST' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function installAuthInterceptor() {
  if (typeof window === 'undefined' || installed) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await nativeFetch(input, init);

    if (response.status !== 401 || !shouldRefresh(input)) {
      return response;
    }

    const refreshed = await refreshAccessToken(nativeFetch);
    if (!refreshed) return response;

    return nativeFetch(input, init);
  };

  installed = true;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  installAuthInterceptor();
  return fetch(input, init);
}
