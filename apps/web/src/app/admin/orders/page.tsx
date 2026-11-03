'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

interface AdminOrder {
  id: string;
  orderNumber: string;
  userId?: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items?: any[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');

  // Status transition modal
  const [targetOrder, setTargetOrder] = useState<AdminOrder | null>(null);
  const [newStatus, setNewStatus] = useState<string>('PROCESSING');
  const [statusReason, setStatusReason] = useState<string>('');
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.orders.list();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar seluruh pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (o: AdminOrder) => {
    setTargetOrder(o);
    // Suggest plausible next step
    if (o.status === 'PENDING_PAYMENT') setNewStatus('PAID');
    else if (o.status === 'PAID') setNewStatus('PROCESSING');
    else if (o.status === 'PROCESSING') setNewStatus('SHIPPED');
    else if (o.status === 'SHIPPED') setNewStatus('DELIVERED');
    else setNewStatus('PROCESSING');
    setStatusReason(`Pembaruan status operasional oleh administrator`);
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder || transitioning) return;

    setTransitioning(true);
    try {
      await api.orders.transitionStatus(targetOrder.orderNumber, newStatus, statusReason);
      setTargetOrder(null);
      await loadOrders();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah status pesanan.');
    } finally {
      setTransitioning(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="badge badge-warning">Menunggu Bayar</span>;
      case 'PAID':
        return <span className="badge badge-success">Lunas</span>;
      case 'PROCESSING':
        return <span className="badge badge-neutral">Diproses</span>;
      case 'SHIPPED':
        return <span className="badge badge-primary">Dikirim</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">Selesai</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Batal</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  if (loading && orders.length === 0) {
    return <StatusNotice type="loading" title="Memuat pesanan toko…" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Pesanan Pelanggan Seluruh Toko</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
            Pantau dan lakukan transisi status pesanan dari pembayaran hingga pengiriman.
          </p>
        </div>
        <button type="button" onClick={loadOrders} className="secondary-button" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'ALL', label: 'Semua Pesanan' },
          { key: 'PENDING_PAYMENT', label: 'Menunggu Bayar' },
          { key: 'PAID', label: 'Lunas' },
          { key: 'PROCESSING', label: 'Diproses' },
          { key: 'SHIPPED', label: 'Dikirim' },
          { key: 'DELIVERED', label: 'Selesai' },
          { key: 'CANCELLED', label: 'Batal' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={filter === tab.key ? 'button' : 'secondary-button'}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <StatusNotice
          type="empty"
          title="Tidak ada pesanan"
          message={`Tidak ada pesanan dengan filter ${filter}.`}
        />
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor Pesanan</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Jumlah Item</th>
                <th style={{ textAlign: 'right' }}>Total Tagihan</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const dateStr = o.createdAt
                  ? new Date(o.createdAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-';

                return (
                  <tr key={o.id || o.orderNumber}>
                    <td>
                      <code style={{ fontSize: '0.85rem' }}>{o.orderNumber}</code>
                    </td>
                    <td className="muted" style={{ fontSize: '0.85rem' }}>{dateStr}</td>
                    <td>{renderStatusBadge(o.status)}</td>
                    <td>{o.items ? o.items.length : '-'} item</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatRupiah(o.totalAmount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleOpenStatusModal(o)}
                        >
                          Ubah Status
                        </button>
                        <Link
                          href={`/orders/${encodeURIComponent(o.orderNumber)}`}
                          className="secondary-button"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}
                        >
                          Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transition Modal */}
      {targetOrder && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Transisi Status Pesanan</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Pesanan: <strong>{targetOrder.orderNumber}</strong><br />
              Status saat ini: {renderStatusBadge(targetOrder.status)}
            </p>

            <form onSubmit={handleStatusTransition}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="o-status">Pilih Status Baru</label>
                <select
                  id="o-status"
                  className="field"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="PAID">PAID (Telah Dikonfirmasi Bayar)</option>
                  <option value="PROCESSING">PROCESSING (Sedang Disiapkan di Gudang)</option>
                  <option value="SHIPPED">SHIPPED (Dalam Pengiriman Kurir)</option>
                  <option value="DELIVERED">DELIVERED (Telah Diterima Pelanggan)</option>
                  <option value="CANCELLED">CANCELLED (Batalkan & Kembalikan Stok)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="o-reason">Catatan / Alasan Perubahan Status</label>
                <textarea
                  id="o-reason"
                  className="field"
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Misal: Paket diserahkan ke kurir ekspedisi"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setTargetOrder(null)}
                >
                  Batal
                </button>
                <button type="submit" className="button" disabled={transitioning}>
                  {transitioning ? 'Menyimpan…' : 'Konfirmasi Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

