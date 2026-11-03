export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  categoryId?: string;
  status: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

type Envelope<T> = { success: boolean; data: T };

function gatewayBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
  }
  return process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
}

export async function getProducts(searchParams: URLSearchParams): Promise<Product[]> {
  const url = new URL('/api/v1/products', gatewayBaseUrl());
  url.search = searchParams.toString();
  try {
    const response = await fetch(url, { next: { revalidate: 10 } });
    if (!response.ok) {
      throw new Error(`Layanan katalog merespons status ${response.status}.`);
    }
    const envelope = (await response.json()) as Envelope<{ items: Product[] } | Product[]>;
    if (envelope.success) {
      if (Array.isArray(envelope.data)) {
        return envelope.data;
      }
      if (Array.isArray((envelope.data as any)?.items)) {
        return (envelope.data as any).items;
      }
    }
    return [];
  } catch (err: any) {
    throw new Error(err?.message || 'Gagal terhubung ke layanan katalog API Gateway.');
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(new URL('/api/v1/categories', gatewayBaseUrl()), {
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error(`Layanan kategori merespons status ${response.status}.`);
    const envelope = (await response.json()) as Envelope<Category[]>;
    if (!envelope.success || !Array.isArray(envelope.data)) {
      return [];
    }
    return envelope.data;
  } catch {
    return [];
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  const response = await fetch(
    new URL(`/api/v1/products/${encodeURIComponent(slug)}`, gatewayBaseUrl()),
    { next: { revalidate: 10 } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Layanan katalog merespons status ${response.status}.`);
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
