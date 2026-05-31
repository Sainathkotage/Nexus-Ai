# Nexus AI

Collaborative workspace for tasks, documents, emails, and team chat — packaged for commercial deployment with Razorpay billing, enterprise SSO, and production Supabase.

## Getting started

```bash
cp .env.example .env.local
# Fill Supabase, OpenAI, and optional Razorpay keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Enterprise features

| Capability | Documentation |
|------------|----------------|
| Razorpay subscriptions, per-seat billing | [docs/ENTERPRISE_DEPLOYMENT.md](docs/ENTERPRISE_DEPLOYMENT.md#1-razorpay-billing) |
| SAML / OIDC SSO (Google Workspace, Azure AD) | [docs/ENTERPRISE_DEPLOYMENT.md](docs/ENTERPRISE_DEPLOYMENT.md#2-organization-sso-saml--oidc) |
| Strict TypeScript & ESLint in production builds | `next.config.ts` |
| Vercel / AWS Amplify + Supabase Cloud | [docs/ENTERPRISE_DEPLOYMENT.md](docs/ENTERPRISE_DEPLOYMENT.md#4-global-deployment) |

## Scripts

- `npm run dev` — Next.js + API server
- `npm run build` — Production build (strict; fails on type/lint errors)
- `npm start` — Run production server locally

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/nexus-ai)

Set environment variables from `.env.example` before the first deploy. See the full checklist in [docs/ENTERPRISE_DEPLOYMENT.md](docs/ENTERPRISE_DEPLOYMENT.md).
