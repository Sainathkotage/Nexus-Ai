type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (r: { error: { description: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpaySubscriptionCheckout(params: {
  subscriptionId: string;
  planLabel: string;
  customerName?: string;
  customerEmail?: string;
  onSuccess?: () => void;
  onDismiss?: () => void;
}): Promise<void> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured');
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Could not load Razorpay checkout');
  }

  const appUrl = window.location.origin;

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: keyId,
      subscription_id: params.subscriptionId,
      name: 'Nexus AI',
      description: `${params.planLabel} workspace subscription`,
      prefill: {
        name: params.customerName,
        email: params.customerEmail,
      },
      theme: { color: '#18181b' },
      callback_url: `${appUrl}/settings?billing=success`,
      redirect: true,
      handler: (response: RazorpayHandlerResponse) => {
        params.onSuccess?.();
        resolve();
        void fetch('/api/billing/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
      },
      modal: {
        ondismiss: () => {
          params.onDismiss?.();
          reject(new Error('Checkout dismissed'));
        },
      },
    });

    rzp.on('payment.failed', (res) => {
      reject(new Error(res.error?.description ?? 'Payment failed'));
    });

    rzp.open();
  });
}
