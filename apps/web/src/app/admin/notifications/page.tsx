'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatusNotice from '@/components/StatusNotice';

interface NotificationLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  channel: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  createdAt?: string;
  created_at?: string;
}

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, statusFilter]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.notifications.listAdmin(statusFilter || undefined, page, 20);
      let items: any[] = [];
      if (Array.isArray(res)) {
        items = res;
      } else if (Array.isArray(res?.items)) {
        items = res.items;
      } else if (Array.isArray(res?.data)) {
        items = res.data;
      }
      setLogs(items);
      if (res?.pagination?.totalPages) {
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat log notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="badge badge-success">SENT</span>;
      case 'PENDING':
        return <span className="badge badge-warning">PENDING</span>;
      case 'FAILED':
        return <span className="badge badge-danger">FAILED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (loading && logs.length === 0) {
    return <StatusNotice type="loading" title="Memuat log notifikasi sistem…" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Audit Log Notifikasi Sistem</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
            Pantau pengiriman email notifikasi pesanan, pembayaran, dan sistem ke pelanggan.
          </p>
        </div>
        <button type="button" onClick={loadLogs} className="secondary-button" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: '', label: 'Semua Status' },
          { key: 'SENT', label: 'Terkirim (SENT)' },
          { key: 'PENDING', label: 'Antrean (PENDING)' },
          { key: 'FAILED', label: 'Gagal (FAILED)' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={statusFilter === tab.key ? 'button' : 'secondary-button'}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <StatusNotice
          type="empty"
          title="Tidak ada riwayat notifikasi"
          message="Log pengiriman pesan belum tercatat dalam sistem."
        />
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Saluran</th>
                <th>Penerima</th>
                <th>Subjek</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const timeStr = log.createdAt || log.created_at
                  ? new Date(log.createdAt || log.created_at || '').toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-';

                return (
                  <tr key={log.id}>
                    <td className="muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {timeStr}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {log.channel || 'EMAIL'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{log.recipient}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{log.subject}</div>
                    </td>
                    <td>{renderStatusBadge(log.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => setSelectedLog(log)}
                      >
                        Lihat Isi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="secondary-button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Sebelumnya
          </button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Detail Pesan Notifikasi</h2>
            <div style={{ backgroundColor: 'var(--surface-raised)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><strong>Penerima:</strong> {selectedLog.recipient}</div>
              <div><strong>Subjek:</strong> {selectedLog.subject}</div>
              <div><strong>Saluran:</strong> {selectedLog.channel}</div>
              <div><strong>Status:</strong> {selectedLog.status}</div>
            </div>

            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Isi Konten:</h3>
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                color: 'var(--text)',
              }}
            >
              {selectedLog.body}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                type="button"
                className="button"
                onClick={() => setSelectedLog(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

