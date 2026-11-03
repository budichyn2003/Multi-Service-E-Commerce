'use client';

import React, { useState } from 'react';
import { useCart } from '@/lib/cart-context';

export interface ProductData {
  id: string;
  sku?: string;
  slug?: string;
  name: string;
  price: number;
  stock?: number;
}

export default function AddToCartButton({
  product,
  quantity = 1,
  className,
}: {
  product: ProductData;
  quantity?: number;
  className?: string;
}) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || isOutOfStock) return;

    setLoading(true);
    setError(null);

    try {
      await addItem(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          slug: product.slug,
          sku: product.sku,
        },
        quantity,
      );
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Gagal menambahkan');
    } finally {
      setLoading(false);
    }
  }

  if (isOutOfStock) {
    return (
      <button type="button" disabled className={className} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
        Stok Habis
      </button>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        aria-live="polite"
      >
        {loading ? 'Menambahkan…' : added ? '✓ Ditambahkan' : 'Tambah ke Keranjang'}
      </button>
      {error && (
        <span className="muted" role="alert" style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
