'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

interface PaymentData {
  id: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  expiresAt?: string;
  createdAt?: string;
}

export default function PaymentView({ paymentId }: { paymentId: string }) {
  const router = useRouter();

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState(false);

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.payments.get(paymentId);
      setPayment(data);
      if (data?.status === 'PAID') {
        setSimulationSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat rincian pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSuccess = async () => {
    setSimulating(true);
    setError(null);
    try {
      const res = await api.payments.simulateSuccess(paymentId);
      setSimulationSuccess(true);
      if (res) {
        setPayment((prev) => (prev ? { ...prev, status: 'PAID' } : (res as any)));
      }
    } catch (err: any) {
      setError(err?.message || 'Simulasi pembayaran gagal.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !payment) {
    return <StatusNotice type="loading" title="Memuat sesi pembayaran…" />;
  }

  const isPaid = payment?.status === 'PAID' || simulationSuccess;

  return (
    <div style={{ maxWidth: '580px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <p className="eyebrow" style={{ textAlign: 'center' }}>MarketForge Gerbang Pembayaran</p>
        <h1 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          {isPaid ? 'Pembayaran Berhasil Dikonfirmasi' : 'Menunggu Pembayaran'}
        </h1>

        {error && (
          <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="muted">ID Transaksi</span>
            <code style={{ fontSize: '0.85rem' }}>{paymentId}</code>
          </div>

          {payment?.orderNumber && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="muted">Nomor Pesanan</span>
              <strong style={{ letterSpacing: '0.05em' }}>{payment.orderNumber}</strong>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="muted">Status Pembayaran</span>
            <div>
              {isPaid ? (
                <span className="badge badge-success">LUNAS (PAID)</span>
              ) : payment?.status === 'EXPIRED' ? (
                <span className="badge badge-danger">KEDALUWARSA</span>
              ) : (
                <span className="badge badge-warning">MENUNGGU PEMBAYARAN</span>
              )}
            </div>
          </div>

          {payment?.amount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <span className="muted">Total yang Harus Dibayar</span>
              <span className="price" style={{ fontSize: '1.4rem' }}>{formatRupiah(payment.amount)}</span>
            </div>
          )}
        </div>

        {isPaid ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', margin: '1rem 0' }}>✅</div>
            <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem' }}>
              Transaksi Anda telah berhasil diverifikasi!
            </p>
            <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Reservasi stok telah dikonfirmasi dan pesanan Anda kini masuk ke tahap pemrosesan.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {payment?.orderNumber ? (
                <Link href={`/orders/${payment.orderNumber}`} className="button" style={{ textDecoration: 'none' }}>
                  Lacak Pesanan Saya
                </Link>
              ) : (
                <Link href="/orders" className="button" style={{ textDecoration: 'none' }}>
                  Lihat Daftar Pesanan
                </Link>
              )}
              <Link href="/" className="secondary-button" style={{ textDecoration: 'none' }}>
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="card" style={{ padding: '1rem', borderStyle: 'dashed', borderColor: 'var(--accent)', marginBottom: '1.5rem', textAlign: 'center' }}>
              <p className="eyebrow" style={{ color: 'var(--accent)', margin: '0 0 0.5rem 0' }}>
                Simulasi Lingkungan Sandbox
              </p>
              <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                Untuk menguji alur pembayaran tanpa kartu kredit atau transfer perbankan sungguhan, klik tombol simulasi di bawah ini.
              </p>
            </div>

            <button
              type="button"
              className="button"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
              onClick={handleSimulateSuccess}
              disabled={simulating}
            >
              {simulating ? 'Mengonfirmasi Pembayaran…' : 'Simulasikan Pembayaran Berhasil'}
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Link href="/orders" className="text-link" style={{ fontSize: '0.85rem' }}>
                Bayar Nanti & Kembali ke Pesanan
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

