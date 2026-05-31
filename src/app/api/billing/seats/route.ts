import { NextResponse } from 'next/server';
import { getRazorpay, isRazorpayConfigured } from '@/lib/razorpay';
import { BILLING_PLANS, type BillingPlanId } from '@/lib/billing/plans';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 503 });
  }

  const { organizationId, seatCount } = await request.json();
  const seats = Math.max(1, Number(seatCount) || 1);

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: org, error } = await admin
    .from('organizations')
    .select('razorpay_subscription_id, plan_id, seat_count')
    .eq('id', organizationId)
    .single();

  if (error || !org?.razorpay_subscription_id) {
    return NextResponse.json(
      { error: 'No active subscription. Use checkout to subscribe.' },
      { status: 404 }
    );
  }

  const planId = (org.plan_id ?? 'starter') as BillingPlanId;
  const plan = BILLING_PLANS[planId];
  if (plan.seatLimit !== null && seats > plan.seatLimit) {
    return NextResponse.json(
      { error: `${plan.label} allows at most ${plan.seatLimit} seats. Upgrade your plan.` },
      { status: 400 }
    );
  }

  const razorpay = getRazorpay();
  await razorpay.subscriptions.update(org.razorpay_subscription_id, {
    quantity: seats,
    schedule_change_at: 'now',
  });

  await admin
    .from('organizations')
    .update({ seat_count: seats, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  return NextResponse.json({ seatCount: seats });
}
