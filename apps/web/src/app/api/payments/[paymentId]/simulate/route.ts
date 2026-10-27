import { NextResponse } from 'next/server';

type RouteContext = { params: { paymentId: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const orderService = process.env.ORDER_SERVICE_URL ?? 'http://localhost:8082';
  try {
    const response = await fetch(
      `${orderService}/api/v1/payments/${encodeURIComponent(params.paymentId)}/simulate-success`,
      { method: 'POST', cache: 'no-store' },
    );
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error) {
    console.error('mock payment proxy failed', error);
    return NextResponse.json(
      { success: false, error: { code: 'PAYMENT_SERVICE_UNAVAILABLE', message: 'Payment service tidak dapat dihubungi.' } },
      { status: 503 },
    );
  }
}
