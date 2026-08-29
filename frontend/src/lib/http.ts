/**
 * HTTP layer. Exposes typed errors so callers never need `catch (err: any)`.
 */
export const API_BASE: string = (import.meta.env.VITE_API_URL?.trim() || '').replace(/\/+$/, '');

/** Non-2xx response from the API. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Request never reached the server (offline, DNS, CORS, abort). */
export class NetworkError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/** Client-side validation failure, keyed by form field. */
export class ValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>, message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/** Narrows any thrown value to a human-readable message. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function extractMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail', 'title'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  if (typeof body === 'string' && body.trim()) return body;
  return `Request failed with status ${status}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  let body: unknown = null;

  if (response.status !== 204) {
    if (contentType.includes('application/json')) {
      body = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      body = text || null;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(body, response.status), body);
  }

  return body as T;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new NetworkError('Unable to reach the server. Check your connection.', cause);
  }

  return parseResponse<T>(response);
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Builds a querystring, skipping empty/nullish values. Returns '' or '?a=b'. */
export function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
