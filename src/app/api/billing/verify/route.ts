import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });
  }

  const body = await request.json();
  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  } = body as {
    razorpay_payment_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
  };

  if (!razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
  }

  const payload = razorpay_subscription_id
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : razorpay_payment_id;

  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const valid = timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (razorpay_subscription_id) {
    const admin = createSupabaseAdminClient();
    await admin
      .from('organizations')
      .update({
        razorpay_subscription_id,
        billing_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', razorpay_subscription_id);
  }

  return NextResponse.json({ verified: true });
}
