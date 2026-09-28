import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'MarketForge',
  description: 'Multi-service marketplace learning project',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <header
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <strong>MarketForge</strong>
          <nav aria-label="main navigation" />
        </header>
        <main style={{ maxWidth: 1080, margin: '0 auto', padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
