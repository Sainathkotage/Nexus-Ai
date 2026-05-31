import type { BillingCycle, BillingPlanId } from '@/lib/billing/plans';
import { openRazorpaySubscriptionCheckout } from '@/lib/billing/razorpay-checkout';

export interface CheckoutSessionResponse {
  subscriptionId: string;
  planLabel: string;
  keyId: string;
}

export async function createCheckoutSession(params: {
  planId: BillingPlanId;
  cycle: BillingCycle;
  seatCount: number;
  organizationId?: string;
  customerName?: string;
  customerEmail?: string;
}): Promise<CheckoutSessionResponse> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Checkout failed');
  }
  return data;
}

export async function startRazorpayCheckout(params: {
  planId: BillingPlanId;
  cycle: BillingCycle;
  seatCount: number;
  organizationId?: string;
  customerName?: string;
  customerEmail?: string;
}): Promise<void> {
  const session = await createCheckoutSession(params);
  await openRazorpaySubscriptionCheckout({
    subscriptionId: session.subscriptionId,
    planLabel: session.planLabel,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
  });
}

export async function openBillingManage(organizationId: string): Promise<string> {
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Could not open billing management');
  }
  return data.url;
}

export async function updateSeatCount(
  organizationId: string,
  seatCount: number
): Promise<number> {
  const res = await fetch('/api/billing/seats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, seatCount }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Seat update failed');
  }
  return data.seatCount;
}
