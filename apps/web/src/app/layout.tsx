import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketForge — Marketplace',
  description: 'Temukan produk pilihan di MarketForge.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <header className="site-header">
          <div className="shell header-inner">
            <Link className="brand" href="/" aria-label="MarketForge beranda">
              <span className="brand-mark">M</span>arketForge
            </Link>
            <nav className="nav-links" aria-label="Navigasi utama">
              <Link href="/">Produk</Link>
              <Link href="/cart">Keranjang</Link>
            </nav>
          </div>
        </header>
        <main className="shell page-content">{children}</main>
        <footer className="footer">
          <div className="shell">MarketForge · Belanja lebih mudah, pilihan lebih jelas.</div>
        </footer>
      </body>
    </html>
  );
}
