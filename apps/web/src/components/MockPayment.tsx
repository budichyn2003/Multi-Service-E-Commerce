'use client';

import { useState } from 'react';

export default function MockPayment({ paymentId }: { paymentId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [paid, setPaid] = useState(false);

  async function completePayment() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/simulate`, {
        method: 'POST',
      });
      const result = await response.json() as {
        success?: boolean;
        data?: { status?: string };
        error?: { message?: string };
      };
      if (!response.ok || !result.success || result.data?.status !== 'PAID') {
        throw new Error(result.error?.message ?? 'Pembayaran tidak dapat diproses.');
      }
      setPaid(true);
      setMessage('Pembayaran simulasi berhasil. Status pesanan telah diperbarui.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses pembayaran.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="status-box">
      <p className="eyebrow">Sandbox / Mock provider</p>
      <h1>Konfirmasi pembayaran</h1>
      <p className="muted">Ini adalah simulasi lokal. Tidak ada transaksi uang sungguhan.</p>
      <p><code>{paymentId}</code></p>
      <button type="button" onClick={completePayment} disabled={busy || paid}>
        {busy ? 'Memproses…' : paid ? 'Pembayaran berhasil' : 'Simulasikan pembayaran berhasil'}
      </button>
      <p role="status" aria-live="polite">{message}</p>
    </section>
  );
}
