'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'Email atau kata sandi tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <p className="eyebrow" style={{ textAlign: 'center' }}>MarketForge Autentikasi</p>
        <h1 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '1.5rem' }}>Masuk ke Akun</h1>

        {error && (
          <div className="status-box error" role="alert" style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@domain.com"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password">Kata Sandi</label>
            <input
              id="password"
              type="password"
              required
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {loading ? 'Memverifikasi…' : 'Masuk'}
          </button>
        </form>

        <div style={{ margin: '1.75rem 0', textAlign: 'center', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
          <span
            style={{
              position: 'absolute',
              top: '-0.7rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--surface)',
              padding: '0 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            AKUN DEMO SEED
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
            onClick={() => handleDemoLogin('customer@marketforge.local', 'Customer123!')}
          >
            Customer Demo
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: '0.75rem', padding: '0.5rem 0.25rem' }}
            onClick={() => handleDemoLogin('admin@marketforge.local', 'Admin123!')}
          >
            Admin Demo
          </button>
        </div>

        <p className="muted" style={{ textAlign: 'center', fontSize: '0.875rem', margin: 0 }}>
          Belum memiliki akun?{' '}
          <Link href={`/register${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-link">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

