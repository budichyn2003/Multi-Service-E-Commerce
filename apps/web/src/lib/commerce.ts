export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  categoryId?: string;
  status: string;
};
export type Category = { id: string; name: string; slug: string };

type Envelope<T> = { success: boolean; data: T };

function commerceBaseUrl(): string {
  return process.env.COMMERCE_GO_URL ?? 'http://localhost:8081';
}

export async function getProducts(searchParams: URLSearchParams): Promise<Product[]> {
  const url = new URL('/api/v1/products', commerceBaseUrl());
  url.search = searchParams.toString();
  const response = await fetch(url, { next: { revalidate: 30 } });
  if (!response.ok) {
    throw new Error(`Layanan katalog merespons ${response.status}.`);
  }
  const envelope = (await response.json()) as Envelope<{ items: Product[] }>;
  if (!envelope.success || !Array.isArray(envelope.data?.items)) {
    throw new Error('Respons katalog tidak sesuai format yang diharapkan.');
  }
  return envelope.data.items;
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(new URL('/api/v1/categories', commerceBaseUrl()), {
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Layanan kategori merespons ${response.status}.`);
  const envelope = (await response.json()) as Envelope<Category[]>;
  if (!envelope.success || !Array.isArray(envelope.data)) {
    throw new Error('Respons kategori tidak sesuai format yang diharapkan.');
  }
  return envelope.data;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const response = await fetch(
    new URL(`/api/v1/products/${encodeURIComponent(slug)}`, commerceBaseUrl()),
    { next: { revalidate: 30 } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Layanan katalog merespons ${response.status}.`);
  const envelope = (await response.json()) as Envelope<Product>;
  if (!envelope.success || !envelope.data?.id) {
    throw new Error('Respons produk tidak sesuai format yang diharapkan.');
  }
  return envelope.data;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
