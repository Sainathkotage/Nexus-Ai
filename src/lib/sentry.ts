import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

export function initSentry() {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  } else {
    console.warn('[Sentry Client Mock] SENTRY_DSN is not configured. Errors will log to console.');
  }
}

export function captureError(error: any, context?: any) {
  console.error('[Sentry Logged Error]:', error, context);
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}
