'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Fetch a CSRF token on mount
    fetch('/api/auth/csrf')
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.token))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      let token = csrfToken;
      if (!token) {
        const csrfRes = await fetch('/api/auth/csrf');
        const csrfData = await csrfRes.json();
        token = csrfData.token;
        if (token) setCsrfToken(token);
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        const from = searchParams.get('from') || '/today';
        router.push(from);
        router.refresh();
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setPassword('');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          autoFocus
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className={styles.errorMsg} role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-md"
        style={{ width: '100%' }}
        disabled={loading || !password.trim()}
        id="login-submit"
      >
        {loading ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="#0F172A" />
              <path d="M14 6v9l5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="15" r="7" stroke="#2563EB" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className={styles.appName}>Time Ledger</h1>
        </div>

        <p className={styles.tagline}>Your personal record of where time went.</p>

        <Suspense fallback={<div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
