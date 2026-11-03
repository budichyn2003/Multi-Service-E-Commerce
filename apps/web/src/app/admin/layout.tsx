'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import StatusNotice from '@/components/StatusNotice';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/login?redirect=/admin');
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return <StatusNotice type="loading" title="Memeriksa hak akses administrator…" />;
  }

  if (!user || !isAdmin) {
    return (
      <div style={{ maxWidth: '480px', margin: '3rem auto' }}>
        <StatusNotice
          type="error"
          title="Akses Ditolak (403 Forbidden)"
          message="Halaman ini hanya dapat diakses oleh akun dengan peran ADMINISTRATOR."
          actionText="Kembali ke Beranda"
          actionHref="/"
        />
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Manajemen Produk & Stok', exact: true },
    { href: '/admin/categories', label: 'Kategori Produk' },
    { href: '/admin/orders', label: 'Daftar Pesanan Seluruh Toko' },
    { href: '/admin/notifications', label: 'Log Notifikasi Sistem' },
  ];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <span className="badge badge-primary">Mode Administrator</span>
          <h1 style={{ fontSize: '1.75rem', margin: '0.25rem 0' }}>Panel Manajemen MarketForge</h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Akses penuh untuk katalog, inventaris stok, transisi status pesanan, dan monitoring audit log.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/" className="secondary-button" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
            Lihat Toko Publik →
          </Link>
        </div>
      </div>

      {/* Admin Subnav */}
      <nav style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'button' : 'secondary-button'}
              style={{
                textDecoration: 'none',
                fontSize: '0.85rem',
                padding: '0.45rem 0.9rem',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}

