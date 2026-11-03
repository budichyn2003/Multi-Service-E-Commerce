import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';
import { formatRupiah, getProduct } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

type Props = { params: { slug: string } };

export default async function ProductDetailPage({ params }: Props) {
  let product;
  try {
    product = await getProduct(params.slug);
  } catch (error) {
    return (
      <StatusNotice
        type="error"
        title="Produk belum dapat dimuat"
        message={error instanceof Error ? error.message : 'Terjadi gangguan saat menghubungi katalog.'}
        actionText="Kembali ke Katalog"
        actionHref="/"
      />
    );
  }

  if (!product) notFound();

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="eyebrow">
          <Link href="/" className="text-link">Katalog</Link> / <span className="muted">{product.name}</span>
        </p>
      </div>

      <section className="detail-layout">
        <div className="detail-art" aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>MF</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>SKU: {product.sku}</span>
          <div style={{ marginTop: '1rem' }}>
            {isOutOfStock ? (
              <span className="badge badge-danger">Stok Habis</span>
            ) : isLowStock ? (
              <span className="badge badge-warning">Stok Terbatas (Sisa {product.stock})</span>
            ) : (
              <span className="badge badge-success">Stok Tersedia {product.stock !== undefined ? `(${product.stock})` : ''}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span className="badge badge-neutral" style={{ marginBottom: '0.5rem' }}>SKU: {product.sku}</span>
            <h1 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{product.name}</h1>
            <p className="price" style={{ fontSize: '1.75rem', margin: '0.5rem 0' }}>
              {formatRupiah(product.price)}
            </p>
          </div>

          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Deskripsi Produk</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              {product.description || 'Tidak ada deskripsi rinci untuk produk ini.'}
            </p>
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <AddToCartButton product={product} />
            <Link
              href={`/assistant?q=Ceritakan lebih banyak tentang produk ${encodeURIComponent(product.name)}`}
              className="secondary-button"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>🤖 Tanya AI tentang produk ini</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function generateMetadata({ params }: Props) {
  return { title: `${params.slug} — MarketForge Marketplace` };
}
