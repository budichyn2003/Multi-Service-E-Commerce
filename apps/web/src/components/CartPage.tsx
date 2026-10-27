'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CartLine } from './AddToCartButton';
import { formatRupiah } from '@/lib/commerce';

const CART_KEY = 'marketforge-cart-v1';

export default function CartPage() {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartLine[];
      setItems(Array.isArray(saved) ? saved : []);
    } catch {
      setItems([]);
      setLoadError('Data keranjang browser tidak dapat dibaca.');
    }
    setLoaded(true);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  function update(next: CartLine[]) {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  }

  if (!loaded) return <p role="status">Memuat keranjang…</p>;

  return (
    <section>
      <p className="eyebrow">Belanja Anda</p>
      <h1>Keranjang</h1>
      {loadError && <p className="status-box error" role="alert">{loadError}</p>}
      {items.length === 0 ? (
        <div className="empty-state">
          <p>Keranjang masih kosong.</p>
          <Link className="text-link" href="/">Jelajahi produk</Link>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map((item) => (
              <article className="cart-row" key={item.id}>
                <div>
                  <h2>{item.name}</h2>
                  <p className="muted">{formatRupiah(item.price)} per item</p>
                </div>
                <div className="quantity-controls" aria-label={`Jumlah ${item.name}`}>
                  <button
                    className="secondary-button"
                    type="button"
                    aria-label={`Kurangi ${item.name}`}
                    onClick={() => update(items.flatMap((line) =>
                      line.id !== item.id ? [line] : line.quantity <= 1 ? [] : [{ ...line, quantity: line.quantity - 1 }],
                    ))}
                  >−</button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    className="secondary-button"
                    type="button"
                    aria-label={`Tambah ${item.name}`}
                    onClick={() => update(items.map((line) =>
                      line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
                    ))}
                  >+</button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => update(items.filter((line) => line.id !== item.id))}
                  >Hapus</button>
                </div>
                <strong>{formatRupiah(item.price * item.quantity)}</strong>
              </article>
            ))}
          </div>
          <div className="cart-summary">
            <div>
              <span className="muted">Subtotal · belum termasuk ongkir</span>
              <div className="price">{formatRupiah(total)}</div>
            </div>
            <button type="button" disabled title="Checkout tersedia setelah sesi login dan order API terhubung.">
              Checkout segera hadir
            </button>
          </div>
          <p className="muted" role="note">
            Keranjang saat ini tersimpan di browser. Checkout akan diaktifkan setelah autentikasi dan integrasi order siap.
          </p>
        </>
      )}
    </section>
  );
}
