import PaymentView from '@/components/PaymentView';

export default function PaymentPage({ params }: { params: { paymentId: string } }) {
  return <PaymentView paymentId={params.paymentId} />;
}
