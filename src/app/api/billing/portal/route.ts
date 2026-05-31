import { NextResponse } from 'next/server';
import { isRazorpayConfigured } from '@/lib/razorpay';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

/** Razorpay has no hosted customer portal — route admins to in-app billing settings. */
export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 503 });
  }

  const { organizationId } = await request.json();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: org, error } = await admin
    .from('organizations')
    .select('razorpay_subscription_id, plan_id, billing_status')
    .eq('id', organizationId)
    .single();

  if (error || !org?.razorpay_subscription_id) {
    return NextResponse.json(
      { error: 'No active Razorpay subscription. Complete checkout first.' },
      { status: 404 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  return NextResponse.json({
    url: `${appUrl}/settings?section=billing`,
    subscriptionId: org.razorpay_subscription_id,
    planId: org.plan_id,
    status: org.billing_status,
  });
}
