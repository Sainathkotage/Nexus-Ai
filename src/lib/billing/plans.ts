export type BillingPlanId = 'starter' | 'team_pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface BillingPlan {
  id: BillingPlanId;
  label: string;
  seatLimit: number | null;
  pricePerSeatMonthly: number;
  description: string;
}

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    seatLimit: 1,
    pricePerSeatMonthly: 10,
    description: '1 workspace seat',
  },
  team_pro: {
    id: 'team_pro',
    label: 'Team Pro',
    seatLimit: 15,
    pricePerSeatMonthly: 19,
    description: 'Up to 15 seats',
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    seatLimit: null,
    description: 'Unlimited seats',
    pricePerSeatMonthly: 49,
  },
};

const PLAN_ENV_KEYS: Record<BillingPlanId, Record<BillingCycle, string>> = {
  starter: {
    monthly: 'RAZORPAY_PLAN_STARTER_MONTHLY',
    yearly: 'RAZORPAY_PLAN_STARTER_YEARLY',
  },
  team_pro: {
    monthly: 'RAZORPAY_PLAN_TEAM_PRO_MONTHLY',
    yearly: 'RAZORPAY_PLAN_TEAM_PRO_YEARLY',
  },
  enterprise: {
    monthly: 'RAZORPAY_PLAN_ENTERPRISE_MONTHLY',
    yearly: 'RAZORPAY_PLAN_ENTERPRISE_YEARLY',
  },
};

export function getRazorpayPlanId(
  planId: BillingPlanId,
  cycle: BillingCycle
): string | null {
  const envKey = PLAN_ENV_KEYS[planId][cycle];
  return process.env[envKey] ?? null;
}

export function planIdFromLabel(label: string): BillingPlanId | null {
  const normalized = label.toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'team_pro' || normalized === 'team pro') return 'team_pro';
  if (normalized === 'starter') return 'starter';
  if (normalized === 'enterprise') return 'enterprise';
  return null;
}

export function labelFromPlanId(planId: BillingPlanId): string {
  return BILLING_PLANS[planId].label;
}

/** Razorpay subscription billing cycles for prepaid plans */
export function subscriptionTotalCount(cycle: BillingCycle): number {
  return cycle === 'yearly' ? 1 : 12;
}
