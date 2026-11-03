import React from 'react';
import Link from 'next/link';

interface StatusNoticeProps {
  type?: 'error' | 'success' | 'info' | 'empty' | 'loading';
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export default function StatusNotice({
  type = 'info',
  title,
  message,
  actionText,
  actionHref,
  onAction,
  children,
}: StatusNoticeProps) {
  if (type === 'loading') {
    return (
      <div className="status-box text-center" role="status" aria-live="polite">
        <p className="eyebrow">Memuat Data</p>
        <h2>{title || 'Sedang memuat…'}</h2>
        {message && <p className="muted">{message}</p>}
      </div>
    );
  }

  if (type === 'empty') {
    return (
      <div className="empty-state" role="status">
        <p className="eyebrow">Data Kosong</p>
        <h2>{title || 'Tidak ada data untuk ditampilkan'}</h2>
        {message && <p className="muted">{message}</p>}
        {actionHref && actionText && (
          <Link href={actionHref} className="text-link" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
            {actionText}
          </Link>
        )}
        {onAction && actionText && (
          <button type="button" onClick={onAction} style={{ marginTop: '0.75rem' }}>
            {actionText}
          </button>
        )}
        {children}
      </div>
    );
  }

  const boxClass = type === 'error' ? 'status-box error' : 'status-box';

  return (
    <div className={boxClass} role={type === 'error' ? 'alert' : 'status'}>
      {title && <h2>{title}</h2>}
      {message && <p>{message}</p>}
      {children}
      {actionHref && actionText && (
        <div style={{ marginTop: '0.75rem' }}>
          <Link href={actionHref} className="text-link">
            {actionText}
          </Link>
        </div>
      )}
      {onAction && actionText && (
        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" onClick={onAction}>
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
}

