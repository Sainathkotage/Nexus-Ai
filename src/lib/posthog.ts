import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: true,
      });
    } else {
      console.warn('[PostHog Client Mock] NEXT_PUBLIC_POSTHOG_KEY is not configured. Analytics events will log to console.');
    }
  }
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.capture(eventName, properties);
    } else {
      console.log(`[PostHog Mock Event] ${eventName}:`, properties);
    }
  }
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.identify(userId, properties);
    } else {
      console.log(`[PostHog Mock Identify] User: ${userId}`, properties);
    }
  }
}

export function resetPostHog() {
  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      posthog.reset();
    } else {
      console.log('[PostHog Mock Reset] User logged out');
    }
  }
}
