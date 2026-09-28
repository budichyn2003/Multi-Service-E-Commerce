// Phase 2 replaces this placeholder with the full storefront.
// It already demonstrates the integration pattern: server component →
// commerce API → graceful fallback when the backend is down.

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
};

async function getProducts(): Promise<Product[]> {
  const commerce = process.env.COMMERCE_PUBLIC_URL ?? 'http://localhost:8081';
  try {
    const res = await fetch(`${commerce}/api/v1/products?limit=8`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { items?: Product[] } };
    return body.data?.items ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <section>
      <h1>Products</h1>
      {products.length === 0 ? (
        <p>
          No products yet. The commerce service may still be starting — refresh in a
          moment, or run <code>make seed</code> after <code>make up</code>.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
          {products.map((p) => (
            <li key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <strong>{p.name}</strong>
              <div>{p.price}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
