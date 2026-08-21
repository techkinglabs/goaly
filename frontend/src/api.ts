export const API_BASE: string =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ''
    ? import.meta.env.VITE_API_URL
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8081'
        : '/api');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  let body: any = null;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else if (response.status !== 204) {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && (body.message || body.error)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, String(message));
  }

  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return parseResponse<T>(response);
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(response);
}
