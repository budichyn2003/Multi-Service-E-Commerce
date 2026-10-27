import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { getCategories, getProducts, type Category, type Product } from '@/lib/commerce';

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function HomePage({ searchParams }: Props) {
  const query = first(searchParams.q).trim();
  const category = first(searchParams.category);
  const sort = first(searchParams.sort) || 'newest';
  const params = new URLSearchParams({ limit: '24', sort });
  if (query) params.set('q', query);
  if (category) params.set('category', category);

  let products: Product[];
  let loadError: string | null = null;
  let categories: Category[] = [];
  let categoryError: string | null = null;
  try {
    products = await getProducts(params);
  } catch (error) {
    products = [];
    loadError = error instanceof Error ? error.message : 'Katalog tidak dapat dimuat.';
  }
  try {
    categories = await getCategories();
  } catch (error) {
    categoryError = error instanceof Error ? error.message : 'Kategori tidak dapat dimuat.';
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow">MarketForge Marketplace</p>
        <h1>Temukan barang yang tepat untuk keseharianmu.</h1>
        <p className="muted">
          Pilihan produk terkurasi dengan harga dan ketersediaan yang jelas.
        </p>
      </section>

      <form className="toolbar" action="/" method="get" role="search">
        <label className="sr-only" htmlFor="product-search">Cari produk</label>
        <input
          className="field"
          id="product-search"
          name="q"
          type="search"
          placeholder="Cari nama atau deskripsi produk…"
          defaultValue={query}
        />
        <label className="sr-only" htmlFor="category">Kategori</label>
        <select className="field" id="category" name="category" defaultValue={category}>
          <option value="">Semua kategori</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sort">Urutkan produk</label>
        <select className="field" id="sort" name="sort" defaultValue={sort}>
          <option value="newest">Terbaru</option>
          <option value="price_asc">Harga terendah</option>
          <option value="price_desc">Harga tertinggi</option>
          <option value="name_asc">Nama A–Z</option>
        </select>
        <button type="submit">Cari produk</button>
      </form>

      <div className="section-heading">
        <div>
          <h2>{query ? `Hasil untuk “${query}”` : 'Produk pilihan'}</h2>
          <p className="muted">{products.length} produk ditampilkan</p>
        </div>
        {categoryError && <p className="muted" role="status">Filter kategori sementara tidak tersedia: {categoryError}</p>}
        {(query || category) && <Link className="text-link" href="/">Hapus filter</Link>}
      </div>

      {loadError ? (
        <div className="status-box error" role="alert">
          <strong>Katalog belum dapat dimuat.</strong>
          <p>{loadError}</p>
          <p>Pastikan Commerce Service dan PostgreSQL sudah berjalan, lalu muat ulang halaman.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{query ? 'Tidak ada produk yang cocok dengan pencarian ini.' : 'Belum ada produk untuk ditampilkan.'}</p>
          <Link className="text-link" href="/">Lihat semua produk</Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </>
  );
}
