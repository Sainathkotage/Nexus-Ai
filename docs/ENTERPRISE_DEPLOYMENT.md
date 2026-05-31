# Nexus AI — Enterprise & Production Deployment

This guide covers Razorpay billing, organization SSO, strict builds, and global hosting.

## 1. Razorpay Billing

### Dashboard setup

1. Create a [Razorpay account](https://dashboard.razorpay.com) and complete KYC.
2. Enable **Subscriptions** and create six **Plans** (Starter, Team Pro, Enterprise × monthly/yearly) with per-seat quantity billing.
3. Copy each Plan ID into `.env` (see `.env.example`).
4. Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same prefix as `RAZORPAY_KEY_ID`) for client checkout.

### Webhook

In Razorpay Dashboard → Webhooks, point to:

`https://your-domain.com/api/billing/webhook`

Subscribe to: `subscription.activated`, `subscription.charged`, `subscription.updated`, `subscription.cancelled`, `subscription.completed`.

Set `RAZORPAY_WEBHOOK_SECRET` to the webhook signing secret.

### App flows

| Flow | Endpoint |
|------|----------|
| Create subscription & open Checkout | `POST /api/billing/checkout` |
| Manage plan / seats (in-app) | `POST /api/billing/portal` → `/settings?section=billing` |
| Update seat quantity | `POST /api/billing/seats` |
| Verify payment signature | `POST /api/billing/verify` |

Settings and the **landing page** pricing cards use Razorpay when env vars are set; otherwise the local simulator or workspace fallback is used.

## 2. Organization SSO (SAML / OIDC)

### Database

Run `supabase/migrations/20260601000000_enterprise_billing_sso.sql` on your production Supabase project.

### Supabase Auth

1. **Google Workspace**: Authentication → Providers → Google. Restrict with hosted domain (`hd`) or use **SSO / SAML** for Google as IdP.
2. **Microsoft Azure AD**: Enable **Azure** provider; register app in Entra ID with redirect URI `https://<project>.supabase.co/auth/v1/callback`.
3. **SAML**: Supabase Pro → Authentication → **SSO** → add SAML connection per organization domain.

### Organization record

```sql
insert into organizations (name, slug, sso_enabled, sso_domain, sso_provider)
values ('Acme Corp', 'acme', true, 'acme.com', 'google_workspace');
```

Admins save SSO from **Settings → Security & SSO** (requires `NEXT_PUBLIC_DEMO_ORGANIZATION_ID` and admin membership).

Users sign in from the login screen with **Enterprise SSO** or:

`GET /api/enterprise/sso?domain=acme.com`

Callback: `/auth/callback` exchanges the code and optionally auto-provisions seats.

## 3. Strict compilation

`next.config.ts` sets:

- `typescript.ignoreBuildErrors: false` — production builds fail on TypeScript errors.

Run `npm run build:strict` to also enforce ESLint before build (recommended in CI once existing lint debt is cleared).

## 4. Global deployment

### Vercel (recommended)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Set all variables from `.env.example` in Project → Settings → Environment Variables.
3. Set `NEXT_PUBLIC_APP_URL` to your production URL.
4. Deploy; `vercel.json` targets multi-region (`iad1`, `sfo1`, `cdg1`, `sin1`).

### AWS Amplify

1. Connect the repo; Amplify uses `amplify.yml`.
2. Add the same env vars in Amplify Console → Environment variables.
3. Ensure SSR/Next.js hosting matches Amplify’s Next.js support for your version.

### Production Supabase

1. Create a project at [supabase.com](https://supabase.com) (choose region near users).
2. Run the enterprise migration in the SQL editor.
3. Point `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to production (never expose the service role to the browser).

### Post-deploy checklist

- [ ] Razorpay webhook URL live and verified
- [ ] Subscription plans created with correct Plan IDs
- [ ] Supabase redirect URLs include `https://your-domain.com/auth/callback`
- [ ] SAML/OIDC tested with a pilot tenant domain
- [ ] `npm run build` passes locally with production env
