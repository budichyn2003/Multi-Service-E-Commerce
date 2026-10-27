import MockPayment from '@/components/MockPayment';

type Props = { params: { paymentId: string } };

export default function MockPaymentPage({ params }: Props) {
  return <MockPayment paymentId={params.paymentId} />;
}
