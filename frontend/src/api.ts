export const API_BASE: string =
  (import.meta.env.VITE_API_URL?.trim() || '').replace(/\/+$/, '');

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

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

export async function addTargetHistory(goalId: number, validFrom: string, value: number, validTo?: string | null, period: string = 'WEEK') {
  const params = new URLSearchParams({ validFrom, value: String(value), period });
  if (validTo) params.set('validTo', validTo);
  return apiSend<unknown>(`/api/goals/${goalId}/target?${params.toString()}`, 'POST');
}

export async function updateTargetHistory(goalId: number, historyId: number, validFrom: string, value: number, validTo?: string | null, period: string = 'WEEK') {
  const params = new URLSearchParams({ validFrom, value: String(value), period });
  if (validTo) params.set('validTo', validTo);
  return apiSend<unknown>(`/api/goals/${goalId}/target/${historyId}?${params.toString()}`, 'PUT');
}

export async function deleteTargetHistory(goalId: number, historyId: number) {
  return apiSend<void>(`/api/goals/${goalId}/target/${historyId}`, 'DELETE');
}
