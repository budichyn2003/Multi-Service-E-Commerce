import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { getCategories, getProducts, type Category, type Product } from '@/lib/commerce';
import StatusNotice from '@/components/StatusNotice';

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
  const minPrice = first(searchParams.minPrice);
  const maxPrice = first(searchParams.maxPrice);

  const params = new URLSearchParams({ limit: '30', sort });
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);

  let products: Product[] = [];
  let loadError: string | null = null;
  let categories: Category[] = [];

  try {
    products = await getProducts(params);
  } catch (error) {
    products = [];
    loadError = error instanceof Error ? error.message : 'Katalog tidak dapat dimuat.';
  }

  try {
    categories = await getCategories();
  } catch {
    categories = [];
  }

  const hasActiveFilters = Boolean(query || category || minPrice || maxPrice || (sort && sort !== 'newest'));

  return (
    <>
      <section className="hero">
        <p className="eyebrow">MarketForge Marketplace</p>
        <h1>Pilihan Produk Terkurasi & Kualitas Terbaik</h1>
        <p className="muted">
          Jelajahi beragam produk kebutuhan dengan ketersediaan stok aktual, transaksi terverifikasi, dan dukungan asisten cerdas AI.
        </p>
      </section>

      <form className="toolbar" action="/" method="get" role="search" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ flex: '2 1 240px' }}>
          <label className="sr-only" htmlFor="product-search">Cari produk</label>
          <input
            className="field"
            id="product-search"
            name="q"
            type="search"
            placeholder="Cari nama atau deskripsi produk…"
            defaultValue={query}
          />
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label className="sr-only" htmlFor="category">Kategori</label>
          <select className="field" id="category" name="category" defaultValue={category}>
            <option value="">Semua kategori</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 140px' }}>
          <label className="sr-only" htmlFor="sort">Urutkan</label>
          <select className="field" id="sort" name="sort" defaultValue={sort}>
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="name_asc">Nama A–Z</option>
          </select>
        </div>

        <button type="submit" style={{ flex: '0 0 auto' }}>Filter</button>
        {hasActiveFilters && (
          <Link href="/" className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Reset
          </Link>
        )}
      </form>

      <div className="section-heading" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <h2>{query ? `Hasil Pencarian “${query}”` : category ? `Kategori: ${category}` : 'Katalog Produk'}</h2>
          <p className="muted">{products.length} produk ditemukan</p>
        </div>
      </div>

      {loadError ? (
        <StatusNotice
          type="error"
          title="Gagal Memuat Katalog"
          message={loadError}
          actionText="Muat Ulang Halaman"
          actionHref="/"
        />
      ) : products.length === 0 ? (
        <StatusNotice
          type="empty"
          title={hasActiveFilters ? 'Tidak ada produk yang cocok' : 'Belum ada produk di katalog'}
          message={
            hasActiveFilters
              ? 'Coba gunakan kata kunci lain atau hapus filter yang sedang aktif.'
              : 'Produk saat ini sedang diperbarui oleh administrator.'
          }
          actionText="Lihat Semua Produk"
          actionHref="/"
        />
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
