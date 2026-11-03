'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link className="brand" href="/" aria-label="MarketForge Beranda">
            <span className="brand-mark">M</span>arketForge
          </Link>
          <nav className="nav-links" aria-label="Navigasi utama">
            <Link href="/" className={isActive('/') && pathname === '/' ? 'active' : ''}>
              Katalog
            </Link>
            {user && (
              <>
                <Link href="/orders" className={isActive('/orders') ? 'active' : ''}>
                  Pesanan
                </Link>
                <Link href="/notifications" className={isActive('/notifications') ? 'active' : ''}>
                  Notifikasi
                </Link>
              </>
            )}
            <Link href="/assistant" className={isActive('/assistant') ? 'active' : ''}>
              Asisten AI
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`badge badge-neutral ${isActive('/admin') ? 'badge-primary' : ''}`}
                style={{ textDecoration: 'none', marginLeft: '0.25rem' }}
              >
                Admin Panel
              </Link>
            )}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/cart" className="cart-badge-link" aria-label="Keranjang belanja">
            <span>Keranjang</span>
            {itemCount > 0 && <span className="badge badge-primary">{itemCount}</span>}
          </Link>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                href="/profile"
                className="text-link"
                style={{ fontSize: '0.875rem', fontWeight: 500 }}
              >
                {user.name.split(' ')[0]}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="secondary-button"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Keluar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link href="/login" className="secondary-button" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                Masuk
              </Link>
              <Link href="/register" className="button" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

