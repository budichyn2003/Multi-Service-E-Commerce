import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '440px', margin: '3rem auto', textAlign: 'center', color: 'var(--muted)' }}>Memuat halaman masuk…</div>}>
      <LoginForm />
    </Suspense>
  );
}
