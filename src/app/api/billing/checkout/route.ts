import { NextResponse } from 'next/server';
import { getRazorpay, isRazorpayConfigured } from '@/lib/razorpay';
import {
  BILLING_PLANS,
  getRazorpayPlanId,
  labelFromPlanId,
  subscriptionTotalCount,
  type BillingCycle,
  type BillingPlanId,
} from '@/lib/billing/plans';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and plan IDs.' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const planId = body.planId as BillingPlanId;
  const cycle = (body.cycle ?? 'monthly') as BillingCycle;
  const seatCount = Math.max(1, Number(body.seatCount) || 1);
  const organizationId = body.organizationId as string | undefined;

  if (!planId || !BILLING_PLANS[planId]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const plan = BILLING_PLANS[planId];
  if (plan.seatLimit !== null && seatCount > plan.seatLimit) {
    return NextResponse.json(
      { error: `${plan.label} allows at most ${plan.seatLimit} seats` },
      { status: 400 }
    );
  }

  const razorpayPlanId = getRazorpayPlanId(planId, cycle);
  if (!razorpayPlanId) {
    return NextResponse.json(
      { error: `Razorpay plan not configured for ${planId} (${cycle})` },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const razorpay = getRazorpay();
  const admin = createSupabaseAdminClient();

  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    quantity: seatCount,
    total_count: subscriptionTotalCount(cycle),
    customer_notify: 1,
    notes: {
      plan_id: planId,
      organization_id: organizationId ?? '',
      seat_count: String(seatCount),
      billing_cycle: cycle,
    },
  });

  if (organizationId) {
    await admin
      .from('organizations')
      .update({
        razorpay_subscription_id: subscription.id,
        plan_id: planId,
        seat_count: seatCount,
        billing_cycle: cycle,
        billing_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);
  }

  return NextResponse.json({
    subscriptionId: subscription.id,
    planLabel: labelFromPlanId(planId),
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    customerEmail: user?.email ?? body.customerEmail,
    customerName: body.customerName,
  });
}
