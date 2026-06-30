'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '../brand-mark';
import { api, saveSession, Session } from '@/lib/api';
import { brand } from '@/lib/brand';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const session = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
      saveSession(session);
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authBrand">
        <BrandMark tone="light" />
        <blockquote>{brand.authLine}</blockquote>
      </section>
      <section className="authPanel">
        <form className="card" onSubmit={submit}>
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in to your account</h1>
          <p className="muted">Enter the details you used when registering.</p>
          {error && <p className="error">{error}</p>}
          <label>Email<input name="email" type="email" required placeholder="you@company.com" /></label>
          <label>Password<input name="password" type="password" minLength={8} required placeholder="At least 8 characters" /></label>
          <button className="button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          <p className="center muted"><Link href="/forgot-password">Forgot your password?</Link></p>
          <p className="center muted">New to {brand.name}? <Link href="/register">Create an account</Link></p>
          <p className="legalLinks"><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></p>
        </form>
      </section>
    </main>
  );
}
