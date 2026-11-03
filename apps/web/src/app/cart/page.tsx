import type { Metadata } from 'next';
import CartPage from '@/components/CartPage';

export const metadata: Metadata = {
  title: 'Keranjang Belanja — MarketForge',
  description: 'Kelola produk dalam keranjang belanja Anda di MarketForge.',
};

export default function Page() {
  return <CartPage />;
}
