import { buildApiUrl } from './urls';

export const api = {
  request(endpoint: string, options: RequestInit & { data?: unknown } = {}): Promise<Response> {
    const { data, ...init } = options;

    if (data !== undefined && init.body === undefined) {
      const isString = typeof data === 'string';
      init.body = isString ? (data as string) : JSON.stringify(data);

      const headers = new Headers(init.headers ?? {});
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', isString ? 'text/plain' : 'application/json');
      }
      init.headers = headers;
    }

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
