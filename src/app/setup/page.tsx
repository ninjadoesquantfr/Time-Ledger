'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './setup.module.css';

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetch('/api/auth/csrf')
      .then((r) => r.json())
      .then((d) => {
        if (d?.token) setCsrfToken(d.token);
        if (d?.configured) {
          router.replace('/login');
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      let token = csrfToken;
      if (!token) {
        const csrfRes = await fetch('/api/auth/csrf');
        const csrfData = await csrfRes.json();
        token = csrfData.token;
        if (token) setCsrfToken(token);
      }

      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        router.push('/today');
        router.refresh();
      } else {
        setError(data?.error || `Setup failed (${res.status}). Please try again.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoRow}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="#0F172A" />
              <path d="M14 6v9l5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="15" r="7" stroke="#2563EB" strokeWidth="1.5" />
            </svg>
            <span className={styles.appName}>Time Ledger</span>
          </div>
          <h1 className={styles.title}>Set your password</h1>
          <p className={styles.desc}>
            This is a personal app. Set a password to secure your time data.
            You&apos;ll enter it on every session.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className="form-group">
            <label htmlFor="setup-password" className="form-label">Password</label>
            <input
              id="setup-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              autoFocus
              minLength={8}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="setup-confirm" className="form-label">Confirm password</label>
            <input
              id="setup-confirm"
              type="password"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
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
            id="setup-submit"
            type="submit"
            className="btn btn-primary btn-md"
            style={{ width: '100%' }}
            disabled={loading || !password || !confirm}
          >
            {loading ? (
              <><span className="spinner" aria-hidden="true" /> Setting up…</>
            ) : (
              'Set password & enter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
