import { Suspense } from 'react';
import AssistantChat from './AssistantChat';

export default function AssistantPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
        Memuat asisten AI MarketForge…
      </div>
    }>
      <AssistantChat />
    </Suspense>
  );
}
