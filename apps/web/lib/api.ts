export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type Session = {
  accessToken: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  company: { id: string; name: string };
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');

  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new ApiError(body.message ?? 'Something went wrong', response.status);
  }

  return body as T;
}

export function saveSession(session: Session) {
  window.localStorage.setItem('rbs_token', session.accessToken);
  window.localStorage.setItem('rbs_user', JSON.stringify(session.user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('rbs_token');
  window.localStorage.removeItem('rbs_user');
}

export function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('rbs_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStoredUser<T>() {
  if (typeof window === 'undefined') return null;

  try {
    const rawUser = window.localStorage.getItem('rbs_user');
    return rawUser ? (JSON.parse(rawUser) as T) : null;
  } catch {
    clearSession();
    return null;
  }
}
