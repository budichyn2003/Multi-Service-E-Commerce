import React from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/commerce';
import AddToCartButton from './AddToCartButton';

export interface ProductCardProps {
  product: {
    id: string;
    sku: string;
    slug: string;
    name: string;
    description: string;
    price: number;
    stock?: number;
    category?: { name: string; slug: string } | string;
    status?: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  return (
    <article className="product-card">
      <Link href={`/products/${encodeURIComponent(product.slug)}`} aria-label={`Lihat detail ${product.name}`}>
        <div className="product-art" aria-hidden="true">
          <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            {product.sku}
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {isOutOfStock ? (
              <span className="badge badge-danger">Habis</span>
            ) : isLowStock ? (
              <span className="badge badge-warning">Sisa {product.stock}</span>
            ) : (
              <span className="badge badge-success">Tersedia</span>
            )}
          </div>
        </div>
      </Link>
      <div className="product-info">
        <h2>
          <Link href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
        </h2>
        <p>{product.description || 'Produk pilihan dari katalog resmi MarketForge.'}</p>
        <div className="product-footer">
          <span className="price">{formatRupiah(product.price)}</span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
