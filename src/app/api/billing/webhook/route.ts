import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { type BillingPlanId } from '@/lib/billing/plans';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function syncOrganizationSubscription(payload: {
  subscriptionId: string;
  status: string;
  planId?: string;
  seatCount?: number;
  organizationId?: string;
}) {
  const admin = createSupabaseAdminClient();
  const update = {
    razorpay_subscription_id: payload.subscriptionId,
    billing_status: payload.status,
    plan_id: (payload.planId ?? 'team_pro') as BillingPlanId,
    seat_count: payload.seatCount ?? 1,
    updated_at: new Date().toISOString(),
  };

  if (payload.organizationId) {
    await admin.from('organizations').update(update).eq('id', payload.organizationId);
    return;
  }

  await admin
    .from('organizations')
    .update(update)
    .eq('razorpay_subscription_id', payload.subscriptionId);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'RAZORPAY_WEBHOOK_SECRET not set' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body) as {
    event: string;
    payload: {
      subscription?: {
        entity: {
          id: string;
          status: string;
          quantity?: number;
          notes?: Record<string, string>;
        };
      };
    };
  };

  const sub = event.payload?.subscription?.entity;
  if (!sub) {
    return NextResponse.json({ received: true });
  }

  const notes = sub.notes ?? {};

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.updated':
    case 'subscription.pending':
    case 'subscription.halted':
      await syncOrganizationSubscription({
        subscriptionId: sub.id,
        status: sub.status,
        planId: notes.plan_id,
        seatCount: sub.quantity ?? Number(notes.seat_count ?? 1),
        organizationId: notes.organization_id || undefined,
      });
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      await syncOrganizationSubscription({
        subscriptionId: sub.id,
        status: sub.status,
        organizationId: notes.organization_id || undefined,
      });
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
