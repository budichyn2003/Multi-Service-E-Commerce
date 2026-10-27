import Link from 'next/link';
import type { Product } from '@/lib/commerce';
import { formatRupiah } from '@/lib/commerce';
import AddToCartButton from './AddToCartButton';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link href={`/products/${encodeURIComponent(product.slug)}`} aria-label={`Lihat ${product.name}`}>
        <div className="product-art" aria-hidden="true">MF / {product.sku}</div>
      </Link>
      <div className="product-info">
        <h2>
          <Link href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
        </h2>
        <p>{product.description || 'Produk pilihan dari MarketForge.'}</p>
        <div className="product-footer">
          <span className="price">{formatRupiah(product.price)}</span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
