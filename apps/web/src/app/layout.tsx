import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import Header from '@/components/Header';
import AiFloatingWidget from '@/components/AiFloatingWidget';

export const metadata: Metadata = {
  title: 'MarketForge — Modern E-Commerce Platform',
  description: 'Temukan produk pilihan berkualitas di MarketForge Marketplace.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="shell page-content">{children}</main>
            <AiFloatingWidget />
            <footer className="footer">
              <div className="shell" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>MarketForge · E-Commerce Marketplace Modern & Terpercaya.</div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  Multi-Service Microservices Architecture: Commerce, Order, Notification, AI
                </div>
              </div>
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
