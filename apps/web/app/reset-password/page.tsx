'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, saveSession, Session } from '@/lib/api';
import { brand } from '@/lib/brand';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const session = await api<Session>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password: data.get('password') }) });
      saveSession(session);
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <p className="eyebrow">Account recovery</p>
      <h1>Create a new password</h1>
      <p className="muted">Choose a new password with at least 8 characters. The reset link can only be used once.</p>
      {!token && <p className="error">Reset token is missing. Request a new reset link.</p>}
      {error && <p className="error">{error}</p>}
      <label>New password<input name="password" type="password" minLength={8} required placeholder="At least 8 characters" disabled={!token} /></label>
      <button className="button" disabled={loading || !token}>{loading ? 'Resetting...' : 'Reset password'}</button>
      <p className="center muted"><Link href="/forgot-password">Request a new link</Link></p>
      <p className="legalLinks"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="authPage">
      <section className="authBrand">
        <div className="brand light"><span>{brand.initial}</span> {brand.name}</div>
        <blockquote>Choose a strong password and get back to work.</blockquote>
      </section>
      <section className="authPanel">
        <Suspense fallback={<div className="card"><p className="muted">Loading reset form...</p></div>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
