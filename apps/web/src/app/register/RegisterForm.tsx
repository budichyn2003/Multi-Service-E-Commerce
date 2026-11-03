'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || loading) return;
    if (password.length < 8) {
      setError('Kata sandi harus minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(name, email, password);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'Pendaftaran akun gagal. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <p className="eyebrow" style={{ textAlign: 'center' }}>Registrasi Baru</p>
        <h1 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '1.5rem' }}>Buat Akun MarketForge</h1>

        {error && (
          <div className="status-box error" role="alert" style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="name">Nama Lengkap</label>
            <input
              id="name"
              type="text"
              required
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Jane Doe"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email">Alamat Email</label>
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

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="password">Kata Sandi</label>
            <input
              id="password"
              type="password"
              required
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="confirmPassword">Konfirmasi Kata Sandi</label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {loading ? 'Mendaftarkan…' : 'Daftar Akun'}
          </button>
        </form>

        <p className="muted" style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: 0 }}>
          Sudah memiliki akun?{' '}
          <Link href={`/login${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-link">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

