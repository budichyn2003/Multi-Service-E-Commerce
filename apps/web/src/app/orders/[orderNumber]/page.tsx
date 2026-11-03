'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

interface OrderItem {
  id?: string;
  productId: string;
  productName?: string;
  name?: string;
  sku?: string;
  price: number;
  quantity: number;
}

interface OrderHistoryEntry {
  id?: string;
  from_status?: string;
  fromStatus?: string;
  to_status?: string;
  toStatus?: string;
  reason?: string;
  actor_type?: string;
  actorType?: string;
  created_at?: string;
  createdAt?: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddressJson?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export default function OrderDetailPage({ params }: { params: { orderNumber: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const orderNumber = params.orderNumber;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/orders/${encodeURIComponent(orderNumber)}`);
      return;
    }

    if (user) {
      loadOrderData();
    }
  }, [user, authLoading, orderNumber, router]);

  const loadOrderData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, historyRes] = await Promise.all([
        api.orders.get(orderNumber),
        api.orders.getHistory(orderNumber).catch(() => []),
      ]);
      setOrder(orderRes);
      setHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat informasi pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    try {
      const paymentRes = await api.payments.create(orderNumber);
      if (paymentRes?.id) {
        router.push(`/payments/${paymentRes.id}`);
      }
    } catch (err: any) {
      alert(err?.message || 'Gagal membuat sesi pembayaran.');
    }
  };

  const handleCancel = async () => {
    const ok = window.confirm(`Apakah Anda yakin ingin membatalkan pesanan ${orderNumber}?`);
    if (!ok) return;

    setCancelling(true);
    try {
      await api.orders.cancel(orderNumber, 'Dibatalkan oleh pelanggan melalui halaman detail');
      await loadOrderData();
    } catch (err: any) {
      alert(err?.message || 'Gagal membatalkan pesanan.');
    } finally {
      setCancelling(false);
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="badge badge-warning">Menunggu Pembayaran</span>;
      case 'PAID':
        return <span className="badge badge-success">Lunas (Paid)</span>;
      case 'PROCESSING':
        return <span className="badge badge-neutral">Sedang Diproses</span>;
      case 'SHIPPED':
        return <span className="badge badge-primary">Dalam Pengiriman</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">Pesanan Selesai</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Dibatalkan</span>;
      default:
        return <span className="badge badge-neutral">{status || '-'}</span>;
    }
  };

  if (authLoading || (loading && !order)) {
    return <StatusNotice type="loading" title="Memuat detail pesanan…" />;
  }

  if (error || !order) {
    return (
      <StatusNotice
        type="error"
        title="Pesanan Tidak Ditemukan"
        message={error || `Pesanan dengan nomor ${orderNumber} tidak ditemukan.`}
        actionText="Kembali ke Daftar Pesanan"
        actionHref="/orders"
      />
    );
  }

  // Parse shipping address
  let addressObj: any = null;
  if (order.shippingAddressJson) {
    try {
      addressObj = JSON.parse(order.shippingAddressJson);
    } catch {
      addressObj = null;
    }
  }

  const canCancel = order.status === 'PENDING_PAYMENT' || order.status === 'PAID';

  return (
    <section>
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="eyebrow">
          <Link href="/orders" className="text-link">Pesanan Saya</Link> / {order.orderNumber}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0.25rem 0' }}>Pesanan {order.orderNumber}</h1>
            <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              Dibuat pada {new Date(order.createdAt).toLocaleString('id-ID')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {renderStatusBadge(order.status)}
            <Link
              href={`/assistant?orderNumber=${encodeURIComponent(order.orderNumber)}`}
              className="secondary-button"
              style={{ fontSize: '0.85rem', textDecoration: 'none' }}
            >
              🤖 Bantuan AI Pesanan
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Items & Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Order Items Table */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Rincian Produk</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th style={{ textAlign: 'center' }}>Jumlah</th>
                    <th style={{ textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.name || item.productName || 'Produk MarketForge'}</div>
                          {item.sku && <div className="muted" style={{ fontSize: '0.75rem' }}>SKU: {item.sku}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatRupiah(item.price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatRupiah(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                        Rincian item tidak tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Alamat Tujuan Pengiriman</h2>
            {addressObj ? (
              <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{addressObj.recipient_name}</div>
                <div className="muted">{addressObj.phone}</div>
                <div style={{ marginTop: '0.5rem' }}>{addressObj.address_line}</div>
                <div>{addressObj.city}, {addressObj.province} {addressObj.postal_code}</div>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                {order.shippingAddressJson || 'Informasi alamat pengiriman standar terdaftar.'}
              </p>
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Riwayat & Jejak Status (Audit Timeline)</h2>
            {history.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                Belum ada pembaruan status tambahan. Pesanan dalam status awal: {order.status}.
              </p>
            ) : (
              <div className="timeline">
                {history.map((entry, idx) => {
                  const toStat = entry.to_status || entry.toStatus;
                  const fromStat = entry.from_status || entry.fromStatus;
                  const timeStr = entry.created_at || entry.createdAt
                    ? new Date(entry.created_at || entry.createdAt || '').toLocaleString('id-ID')
                    : '-';

                  return (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-point" />
                      <div className="timeline-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{toStat}</span>
                          {fromStat && (
                            <span className="muted" style={{ fontSize: '0.8rem' }}>
                              (sebelumnya: {fromStat})
                            </span>
                          )}
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            {entry.actor_type || entry.actorType || 'SYSTEM'}
                          </span>
                        </div>
                        {entry.reason && (
                          <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {entry.reason}
                          </p>
                        )}
                        <span className="muted" style={{ fontSize: '0.75rem' }}>{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financial Summary & Actions */}
        <aside className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-raised)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ringkasan Biaya</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            <span className="muted">Subtotal Produk</span>
            <span>{formatRupiah(order.subtotal || 0)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.95rem' }}>
            <span className="muted">Biaya Pengiriman</span>
            <span>{formatRupiah(order.shippingAmount || 0)}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 600 }}>Total Tagihan</span>
            <span className="price" style={{ fontSize: '1.4rem' }}>{formatRupiah(order.totalAmount)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.status === 'PENDING_PAYMENT' && (
              <button
                type="button"
                className="button"
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={handlePay}
              >
                Bayar Sekarang
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                className="secondary-button"
                style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(255, 170, 161, 0.3)', padding: '0.75rem' }}
                disabled={cancelling}
                onClick={handleCancel}
              >
                {cancelling ? 'Membatalkan…' : 'Batalkan Pesanan'}
              </button>
            )}

            <Link href="/orders" className="secondary-button" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.75rem' }}>
              ← Kembali ke Pesanan
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

