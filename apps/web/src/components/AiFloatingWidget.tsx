'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AiFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await api.ai.chat(query);
      setResponse(res.answer);
    } catch (err: any) {
      setError(err?.message || 'Gagal menghubungi asisten AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="floating-ai-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Buka Tanya MarketForge AI"
        title="Tanya MarketForge AI"
      >
        <span>🤖 AI Assistant</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="MarketForge AI Widget"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '2rem',
            width: '360px',
            maxWidth: 'calc(100vw - 4rem)',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>MarketForge AI</p>
              <h3 style={{ fontSize: '1.1rem', margin: '0.25rem 0 0 0' }}>Bantuan Cepat</h3>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsOpen(false)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            >
              ✕
            </button>
          </div>

          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Tanyakan ketersediaan produk, kebijakan pesanan, atau rekomendasi belanja.
          </p>

          <form onSubmit={handleAsk} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik pertanyaan..."
              style={{ fontSize: '0.875rem' }}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !query.trim()} style={{ fontSize: '0.875rem', padding: '0 0.75rem' }}>
              {loading ? '…' : 'Kirim'}
            </button>
          </form>

          {loading && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              🤖 Sedang menganalisis katalog & pesanan…
            </div>
          )}

          {error && (
            <div className="status-box error" style={{ fontSize: '0.8rem', padding: '0.5rem', marginTop: '0.5rem' }}>
              {error}
            </div>
          )}

          {response && (
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                fontSize: '0.875rem',
                maxHeight: '180px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                marginTop: '0.5rem',
              }}
            >
              {response}
            </div>
          )}

          <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
            <Link
              href="/assistant"
              className="text-link"
              style={{ fontSize: '0.8rem' }}
              onClick={() => setIsOpen(false)}
            >
              Buka Layar Penuh Asisten AI →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

