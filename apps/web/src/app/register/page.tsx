import { Suspense } from 'react';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '440px', margin: '3rem auto', textAlign: 'center', color: 'var(--muted)' }}>Memuat halaman pendaftaran…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
