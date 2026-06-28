const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type Session = {
  accessToken: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  company: { id: string; name: string };
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('rbs_token') : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? 'Something went wrong');
  return body as T;
}

export function saveSession(session: Session) {
  window.localStorage.setItem('rbs_token', session.accessToken);
  window.localStorage.setItem('rbs_user', JSON.stringify(session.user));
}
