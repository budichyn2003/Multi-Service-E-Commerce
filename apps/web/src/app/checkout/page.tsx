'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { api } from '@/lib/api';
import { formatRupiah } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

interface Address {
  id: string;
  label?: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  province?: string;
  postal_code?: string;
  is_default?: boolean;
}

const STANDARD_SHIPPING = 10000;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, totalAmount, clearCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // New address modal/inline state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newLabel, setNewLabel] = useState('Rumah');
  const [newRecipient, setNewRecipient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLine, setNewLine] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newPostal, setNewPostal] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  // Submitting order
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (user) {
      loadAddresses();
    }
  }, [user, authLoading, router]);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data = await api.user.getAddresses();
      if (Array.isArray(data)) {
        setAddresses(data);
        const def = data.find((a) => a.is_default);
        if (def) {
          setSelectedAddressId(def.id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat alamat:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient || !newPhone || !newLine || !newCity) return;

    setSavingAddress(true);
    try {
      const created = await api.user.createAddress({
        label: newLabel,
        recipient_name: newRecipient,
        phone: newPhone,
        address_line: newLine,
        city: newCity,
        province: newProvince || 'DKI Jakarta',
        postal_code: newPostal || '12345',
        is_default: addresses.length === 0,
      });

      await loadAddresses();
      if (created?.id) {
        setSelectedAddressId(created.id);
      }
      setShowNewAddressForm(false);
      // Reset form
      setNewRecipient('');
      setNewPhone('');
      setNewLine('');
      setNewCity('');
      setNewProvince('');
      setNewPostal('');
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan alamat baru');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0 || submitting) return;

    const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddr) {
      setOrderError('Harap pilih alamat pengiriman sebelum melanjutkan.');
      return;
    }

    setSubmitting(true);
    setOrderError(null);

    try {
      // 1. Create Order
      const orderPayload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        shippingAddressJson: JSON.stringify(selectedAddr),
      };

      const orderRes = await api.orders.create(orderPayload);
      const orderNumber = orderRes.orderNumber || orderRes.order_number;

      if (!orderNumber) {
        throw new Error('Nomor pesanan tidak valid dari server.');
      }

      // 2. Initiate Payment Session
      const paymentRes = await api.payments.create(orderNumber);
      const paymentId = paymentRes.id;

      // 3. Clear cart and redirect to payment screen
      clearCart();

      if (paymentId) {
        router.push(`/payments/${paymentId}`);
      } else {
        router.push(`/orders/${orderNumber}`);
      }
    } catch (err: any) {
      setOrderError(err?.message || 'Terjadi kesalahan saat membuat pesanan.');
      setSubmitting(false);
    }
  };

  if (authLoading || (loadingAddresses && addresses.length === 0)) {
    return <StatusNotice type="loading" title="Mempersiapkan data checkout…" />;
  }

  if (items.length === 0) {
    return (
      <section style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <StatusNotice
          type="empty"
          title="Keranjang Masih Kosong"
          message="Tidak ada produk untuk di-checkout. Silakan pilih produk terlebih dahulu."
          actionText="Belanja Sekarang"
          actionHref="/"
        />
      </section>
    );
  }

  const grandTotal = totalAmount + STANDARD_SHIPPING;

  return (
    <section>
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="eyebrow">
          <Link href="/cart" className="text-link">Keranjang</Link> / Checkout
        </p>
        <h1>Konfirmasi Checkout</h1>
      </div>

      {orderError && (
        <div className="status-box error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <strong>Pemesanan Tidak Dapat Diproses</strong>
          <p>{orderError}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Left column: Shipping Address & Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Shipping Address Selection */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Alamat Pengiriman</h2>
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                onClick={() => setShowNewAddressForm((p) => !p)}
              >
                {showNewAddressForm ? 'Tutup Formulir' : '+ Tambah Alamat'}
              </button>
            </div>

            {/* New Address Form */}
            {showNewAddressForm && (
              <form onSubmit={handleSaveAddress} style={{ background: 'var(--surface-raised)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Tambah Alamat Baru</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="addr-label">Label (misal: Rumah/Kantor)</label>
                    <input
                      id="addr-label"
                      className="field"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="addr-recipient">Nama Penerima</label>
                    <input
                      id="addr-recipient"
                      className="field"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      placeholder="Nama lengkap"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="addr-phone">Nomor Telepon</label>
                    <input
                      id="addr-phone"
                      className="field"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0812345678"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="addr-city">Kota / Kabupaten</label>
                    <input
                      id="addr-city"
                      className="field"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Jakarta Selatan"
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="addr-line">Alamat Lengkap</label>
                  <textarea
                    id="addr-line"
                    className="field"
                    rows={2}
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="addr-province">Provinsi</label>
                    <input
                      id="addr-province"
                      className="field"
                      value={newProvince}
                      onChange={(e) => setNewProvince(e.target.value)}
                      placeholder="DKI Jakarta"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="addr-postal">Kode Pos</label>
                    <input
                      id="addr-postal"
                      className="field"
                      value={newPostal}
                      onChange={(e) => setNewPostal(e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" disabled={savingAddress} className="button" style={{ padding: '0.5rem 1rem' }}>
                    {savingAddress ? 'Menyimpan…' : 'Simpan Alamat'}
                  </button>
                  <button type="button" onClick={() => setShowNewAddressForm(false)} className="secondary-button" style={{ padding: '0.5rem 1rem' }}>
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* Address List */}
            {addresses.length === 0 && !showNewAddressForm ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p className="muted" style={{ marginBottom: '0.75rem' }}>
                  Anda belum memiliki alamat pengiriman tersimpan.
                </p>
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowNewAddressForm(true)}
                  style={{ fontSize: '0.875rem' }}
                >
                  + Buat Alamat Pengiriman
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: '0.75rem',
                        padding: '1rem',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        backgroundColor: isSelected ? 'var(--surface-raised)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ marginTop: '0.25rem' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>{addr.recipient_name}</span>
                          <span className="muted">({addr.phone})</span>
                          {addr.label && <span className="badge badge-neutral">{addr.label}</span>}
                          {addr.is_default && <span className="badge badge-primary">Utama</span>}
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {addr.address_line}, {addr.city}, {addr.province} {addr.postal_code}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items In Order */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Produk yang Dipesan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                      {item.quantity} × {formatRupiah(item.price)}
                    </p>
                  </div>
                  <span className="price" style={{ fontSize: '1rem' }}>
                    {formatRupiah(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Payment Summary */}
        <aside className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-raised)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ringkasan Pembayaran</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            <span className="muted">Subtotal Produk</span>
            <span>{formatRupiah(totalAmount)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.95rem' }}>
            <span className="muted">Biaya Pengiriman Standar</span>
            <span>{formatRupiah(STANDARD_SHIPPING)}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 600 }}>Total Pembayaran</span>
            <span className="price" style={{ fontSize: '1.5rem' }}>{formatRupiah(grandTotal)}</span>
          </div>

          <button
            type="button"
            className="button"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            disabled={submitting || addresses.length === 0}
            onClick={handlePlaceOrder}
          >
            {submitting ? 'Memproses Pesanan…' : 'Buat Pesanan & Bayar'}
          </button>

          <p className="muted" style={{ fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.5 }}>
            Dengan mengonfirmasi pesanan, Anda menyetujui syarat & ketentuan transaksi di MarketForge. Pembayaran akan dialihkan ke gerbang simulasi sandbox.
          </p>
        </aside>
      </div>
    </section>
  );
}

