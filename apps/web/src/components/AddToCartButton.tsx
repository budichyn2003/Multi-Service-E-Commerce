'use client';

import { useState } from 'react';
import type { Product } from '@/lib/commerce';

export type CartLine = Pick<Product, 'id' | 'slug' | 'name' | 'price'> & {
  quantity: number;
};

const CART_KEY = 'marketforge-cart-v1';

export default function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  function addToCart() {
    setError('');
    try {
      const current = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartLine[];
      const existing = current.find((line) => line.id === product.id);
      if (existing) existing.quantity += 1;
      else {
        current.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          quantity: 1,
        });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(current));
      window.dispatchEvent(new Event('marketforge-cart-change'));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } catch (error) {
      setAdded(false);
      setError(error instanceof Error ? error.message : 'Keranjang tidak dapat disimpan di browser ini.');
    }
  }

  return (
    <span>
      <button type="button" onClick={addToCart} aria-live="polite">
        {added ? 'Ditambahkan' : 'Tambah ke keranjang'}
      </button>
      {error && <span className="muted" role="alert">{error}</span>}
    </span>
  );
}
