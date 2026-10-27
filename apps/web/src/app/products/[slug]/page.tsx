import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';
import { formatRupiah, getProduct } from '@/lib/commerce';

type Props = { params: { slug: string } };

export default async function ProductDetailPage({ params }: Props) {
  let product;
  try {
    product = await getProduct(params.slug);
  } catch (error) {
    return (
      <div className="status-box error" role="alert">
        <h1>Produk belum dapat dimuat.</h1>
        <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat menghubungi katalog.'}</p>
        <Link className="text-link" href="/">Kembali ke katalog</Link>
      </div>
    );
  }
  if (!product) notFound();

  return (
    <>
      <p className="eyebrow"><Link href="/">Katalog</Link> / Detail produk</p>
      <section className="detail-layout">
        <div className="detail-art" aria-hidden="true" />
        <div>
          <p className="eyebrow">{product.sku}</p>
          <h1>{product.name}</h1>
          <p className="price">{formatRupiah(product.price)}</p>
          <p className="muted">{product.description || 'Informasi produk akan segera tersedia.'}</p>
          <AddToCartButton product={product} />
        </div>
      </section>
    </>
  );
}

export function generateMetadata({ params }: Props) {
  return { title: `${params.slug} — MarketForge` };
}
