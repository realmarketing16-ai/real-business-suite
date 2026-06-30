'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { BrandMark } from '../brand-mark';
import { api } from '@/lib/api';
import { brand } from '@/lib/brand';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: data.get('email') }) });
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request password reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authBrand">
        <BrandMark tone="light" />
        <blockquote>Recover access without calling the whole office.</blockquote>
      </section>
      <section className="authPanel">
        <form className="card" onSubmit={submit}>
          <p className="eyebrow">Account recovery</p>
          <h1>Reset your password</h1>
          <p className="muted">Enter your account email. If it exists, we will queue a reset link for delivery.</p>
          {error && <p className="error">{error}</p>}
          {notice && <p className="success">{notice}</p>}
          <label>Email<input name="email" type="email" required placeholder="you@company.com" /></label>
          <button className="button" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
          <p className="center muted"><Link href="/login">Back to sign in</Link></p>
          <p className="legalLinks"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></p>
        </form>
      </section>
    </main>
  );
}
