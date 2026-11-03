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
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  createdAt: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/orders');
      return;
    }

    if (user) {
      loadOrders();
    }
  }, [user, authLoading, router]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.orders.list();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (orderNumber: string) => {
    try {
      const paymentRes = await api.payments.create(orderNumber);
      if (paymentRes?.id) {
        router.push(`/payments/${paymentRes.id}`);
      }
    } catch (err: any) {
      alert(err?.message || 'Gagal membuka sesi pembayaran.');
    }
  };

  const handleCancelOrder = async (orderNumber: string) => {
    const confirmCancel = window.confirm(
      `Apakah Anda yakin ingin membatalkan pesanan ${orderNumber}? Reservasi produk akan dikembalikan.`,
    );
    if (!confirmCancel) return;

    setCancellingOrder(orderNumber);
    try {
      await api.orders.cancel(orderNumber, 'Dibatalkan oleh pelanggan melalui web');
      await loadOrders();
    } catch (err: any) {
      alert(err?.message || 'Gagal membatalkan pesanan.');
    } finally {
      setCancellingOrder(null);
    }
  };

  const renderStatusBadge = (status: string) => {
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
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  if (authLoading || (loading && orders.length === 0)) {
    return <StatusNotice type="loading" title="Memuat riwayat pesanan…" />;
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Aktivitas Belanja</p>
          <h1>Pesanan Saya</h1>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          className="secondary-button"
          style={{ fontSize: '0.85rem' }}
        >
          🔄 Muat Ulang
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
          { key: 'CANCELLED', label: 'Dibatalkan' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={statusFilter === tab.key ? 'button' : 'secondary-button'}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <StatusNotice
          type="empty"
          title="Tidak ada pesanan ditemukan"
          message={
            statusFilter === 'ALL'
              ? 'Anda belum pernah melakukan pemesanan di MarketForge.'
              : `Tidak ada pesanan dengan status ${statusFilter}.`
          }
          actionText="Mulai Belanja"
          actionHref="/"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredOrders.map((order) => {
            const dateStr = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-';

            const canCancel = order.status === 'PENDING_PAYMENT' || order.status === 'PAID';

            return (
              <article key={order.id || order.orderNumber} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>Nomor Pesanan:</span>{' '}
                    <strong style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                      {order.orderNumber}
                    </strong>
                    <span className="muted" style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>
                      {dateStr}
                    </span>
                  </div>
                  <div>{renderStatusBadge(order.status)}</div>
                </div>

                {/* Items preview */}
                <div style={{ padding: '1rem 0' }}>
                  {order.items && order.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span>
                            {item.quantity}× {item.name || item.productName || 'Produk MarketForge'}
                          </span>
                          <span className="muted">{formatRupiah(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>Rincian barang tersimpan dalam arsip.</p>
                  )}
                </div>

                {/* Footer and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>Total Pembayaran:</span>{' '}
                    <span className="price" style={{ fontSize: '1.25rem', marginLeft: '0.5rem' }}>
                      {formatRupiah(order.totalAmount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                      className="secondary-button"
                      style={{ textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      Detail & Lacak
                    </Link>

                    {order.status === 'PENDING_PAYMENT' && (
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => handlePayNow(order.orderNumber)}
                      >
                        Bayar Sekarang
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(255, 170, 161, 0.3)', fontSize: '0.85rem' }}
                        disabled={cancellingOrder === order.orderNumber}
                        onClick={() => handleCancelOrder(order.orderNumber)}
                      >
                        {cancellingOrder === order.orderNumber ? 'Membatalkan…' : 'Batalkan'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

