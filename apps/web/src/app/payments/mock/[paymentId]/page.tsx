import PaymentView from '@/components/PaymentView';

export default function MockPaymentPage({ params }: { params: { paymentId: string } }) {
  return <PaymentView paymentId={params.paymentId} />;
}
