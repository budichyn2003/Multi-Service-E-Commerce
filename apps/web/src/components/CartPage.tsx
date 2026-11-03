'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatRupiah } from '@/lib/commerce';
import StatusNotice from './StatusNotice';

const STANDARD_SHIPPING_FEE = 10000;

export default function CartPage() {
  const router = useRouter();
  const { items, totalAmount, updateQuantity, removeItem, loading } = useCart();
  const { user } = useAuth();

  const handleCheckoutClick = () => {
    if (!user) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (loading && items.length === 0) {
    return <StatusNotice type="loading" title="Memuat keranjang belanja…" />;
  }

  if (items.length === 0) {
    return (
      <section style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <StatusNotice
          type="empty"
          title="Keranjang Belanja Kosong"
          message="Anda belum menambahkan produk ke keranjang belanja."
          actionText="Jelajahi Produk Sekarang"
          actionHref="/"
        />
      </section>
    );
  }

  const grandTotal = totalAmount + STANDARD_SHIPPING_FEE;

  return (
    <section>
      <p className="eyebrow">Pesanan Anda</p>
      <h1 style={{ marginBottom: '1.5rem' }}>Keranjang Belanja</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Item List */}
        <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item) => (
            <article
              key={item.id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>
                  {item.slug ? (
                    <Link href={`/products/${encodeURIComponent(item.slug)}`} className="text-link">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                  {formatRupiah(item.price)} per item
                </p>
                {item.sku && <span className="badge badge-neutral" style={{ marginTop: '0.25rem' }}>SKU: {item.sku}</span>}
              </div>

              {/* Quantity Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="quantity-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label={`Kurangi kuantitas ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label={`Tambah kuantitas ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  style={{ color: 'var(--danger)', borderColor: 'rgba(255, 170, 161, 0.3)', padding: '0.35rem 0.65rem' }}
                  onClick={() => removeItem(item.id)}
                  title="Hapus dari keranjang"
                >
                  Hapus
                </button>
              </div>

              {/* Subtotal */}
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <span className="price" style={{ fontSize: '1.1rem' }}>
                  {formatRupiah(item.price * item.quantity)}
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Order Summary */}
        <aside className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-raised)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ringkasan Belanja</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            <span className="muted">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} barang)</span>
            <span>{formatRupiah(totalAmount)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.95rem' }}>
            <span className="muted">Estimasi Biaya Pengiriman</span>
            <span>{formatRupiah(STANDARD_SHIPPING_FEE)}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 600 }}>Total Tagihan</span>
            <span className="price" style={{ fontSize: '1.5rem' }}>{formatRupiah(grandTotal)}</span>
          </div>

          <button
            type="button"
            className="button"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            onClick={handleCheckoutClick}
          >
            {user ? 'Lanjut ke Checkout' : 'Masuk untuk Checkout'}
          </button>

          {!user && (
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem', textAlign: 'center' }}>
              Anda akan diarahkan ke halaman masuk sebelum melakukan pembayaran pesanan.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
