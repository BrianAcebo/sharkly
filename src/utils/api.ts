import { buildApiUrl } from './urls';

/** If set, these headers (e.g. Authorization: Bearer <token>) are merged into every API request. */
let authHeadersGetter: (() => Promise<Record<string, string>>) | null = null;

export function setApiAuthGetter(getter: () => Promise<Record<string, string>>): void {
  authHeadersGetter = getter;
}

export const api = {
  async request(endpoint: string, options: RequestInit & { data?: unknown } = {}): Promise<Response> {
    const { data, ...init } = options;

    const headers = new Headers(init.headers ?? {});

    if (authHeadersGetter) {
      try {
        const authHeaders = await authHeadersGetter();
        Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
      } catch (e) {
        console.warn('[api] Auth headers failed:', e);
      }
    }

    if (data !== undefined && init.body === undefined) {
      const isString = typeof data === 'string';
      init.body = isString ? (data as string) : JSON.stringify(data);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', isString ? 'text/plain' : 'application/json');
      }
    }
    init.headers = headers;

    return fetch(buildApiUrl(endpoint), init);
  },

  get(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<Response> {
    return this.request(endpoint, { ...(options ?? {}), method: 'GET' });
  },

  post(endpoint: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<Response> {
    return this.request(endpoint, { ...(options ?? {}), method: 'POST', data });
  },

  put(endpoint: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<Response> {
    return this.request(endpoint, { ...(options ?? {}), method: 'PUT', data });
  },

  delete(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<Response> {
    return this.request(endpoint, { ...(options ?? {}), method: 'DELETE' });
  }
};
