'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import StatusNotice from '@/components/StatusNotice';

interface NotificationItem {
  id: string;
  recipient?: string;
  subject: string;
  body: string;
  channel: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  createdAt?: string;
  created_at?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/notifications');
      return;
    }

    if (user) {
      loadNotifications();
    }
  }, [user, authLoading, router]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.notifications.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="badge badge-success">Terkirim</span>;
      case 'PENDING':
        return <span className="badge badge-warning">Dalam Antrean</span>;
      case 'FAILED':
        return <span className="badge badge-danger">Gagal</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (authLoading || (loading && notifications.length === 0)) {
    return <StatusNotice type="loading" title="Memuat kotak masuk notifikasi…" />;
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Pemberitahuan</p>
          <h1>Notifikasi & Pesan Sistem</h1>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          className="secondary-button"
          style={{ fontSize: '0.85rem' }}
        >
          🔄 Segarkan
        </button>
      </div>

      {error && (
        <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <StatusNotice
          type="empty"
          title="Belum ada notifikasi baru"
          message="Pemberitahuan terkait status pesanan, pembayaran, dan informasi akun akan muncul di sini."
          actionText="Belanja di Katalog"
          actionHref="/"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map((notif) => {
            const dateStr = notif.createdAt || notif.created_at
              ? new Date(notif.createdAt || notif.created_at || '').toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-';

            const isExpanded = expandedId === notif.id;

            return (
              <article
                key={notif.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  borderLeft: notif.status === 'SENT' ? '4px solid var(--accent)' : '4px solid var(--border)',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(isExpanded ? null : notif.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {notif.channel || 'EMAIL'}
                      </span>
                      {renderStatusBadge(notif.status)}
                      <span className="muted" style={{ fontSize: '0.8rem' }}>{dateStr}</span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', margin: '0.25rem 0' }}>{notif.subject}</h3>
                    {notif.recipient && (
                      <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                        Tujuan: {notif.recipient}
                      </p>
                    )}
                  </div>

                  <span className="text-link" style={{ fontSize: '0.8rem' }}>
                    {isExpanded ? 'Tutup Isi ▲' : 'Baca Isi ▼'}
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      color: 'var(--text)',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '1rem',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    {notif.body}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

