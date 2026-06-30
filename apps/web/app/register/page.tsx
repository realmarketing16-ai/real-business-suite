'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession, Session } from '@/lib/api';
import { brand } from '@/lib/brand';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const session = await api<Session>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
      saveSession(session);
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authBrand">
        <div className="brand light"><span>{brand.initial}</span> {brand.name}</div>
        <blockquote>{brand.tagline}</blockquote>
      </section>
      <section className="authPanel">
        <form className="card wide" onSubmit={submit}>
          <p className="eyebrow">Alpha 0.1</p>
          <h1>Create your company</h1>
          <p className="muted">Your first account becomes the company owner.</p>
          {error && <p className="error">{error}</p>}
          <div className="twoCols">
            <label>First name<input name="firstName" required minLength={2} /></label>
            <label>Last name<input name="lastName" required minLength={2} /></label>
          </div>
          <label>Company name<input name="companyName" required minLength={2} /></label>
          <label>Work email<input name="email" type="email" required /></label>
          <label>Password<input name="password" type="password" minLength={8} required /></label>
          <button className="button" disabled={loading}>{loading ? 'Creating company...' : 'Create company'}</button>
          <p className="center muted">Already registered? <Link href="/login">Sign in</Link></p>
          <p className="legalLinks"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></p>
        </form>
      </section>
    </main>
  );
}
