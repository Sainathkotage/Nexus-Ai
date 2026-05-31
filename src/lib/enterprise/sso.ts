import { supabase } from '@/lib/supabase';

export type SsoProvider = 'google_workspace' | 'azure_ad' | 'saml';

export interface OrganizationSsoConfig {
  enabled: boolean;
  provider: SsoProvider;
  domain: string;
  metadataUrl?: string;
  autoProvision: boolean;
}

const PROVIDER_LABELS: Record<SsoProvider, string> = {
  google_workspace: 'Google Workspace',
  azure_ad: 'Microsoft Azure AD',
  saml: 'SAML 2.0',
};

export function ssoProviderLabel(provider: SsoProvider): string {
  return PROVIDER_LABELS[provider];
}

export function parseSsoProvider(value: string): SsoProvider {
  if (value.includes('Azure') || value.includes('azure')) return 'azure_ad';
  if (value.includes('Okta') || value.includes('SAML') || value.includes('saml')) {
    return 'saml';
  }
  return 'google_workspace';
}

/**
 * Enterprise SSO via Supabase Auth.
 * SAML: signInWithSSO (Supabase Pro + SAML configured in dashboard).
 * Google Workspace / Azure: OAuth with hosted-domain or Azure provider.
 */
export async function signInWithEnterpriseSso(
  config: Pick<OrganizationSsoConfig, 'provider' | 'domain'>,
  redirectTo?: string
): Promise<{ url: string } | { error: string }> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const callbackUrl = redirectTo ?? `${appUrl}/auth/callback`;

  if (config.provider === 'saml' || config.provider === 'google_workspace') {
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: config.domain,
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      return { error: error.message };
    }
    if (data?.url) {
      return { url: data.url };
    }
    return { error: 'SSO redirect URL was not returned. Configure SAML in Supabase Dashboard.' };
  }

  if (config.provider === 'azure_ad') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: callbackUrl,
        scopes: 'email openid profile',
      },
    });
    if (error) {
      return { error: error.message };
    }
    if (data?.url) {
      return { url: data.url };
    }
    return { error: 'Azure AD OAuth is not configured in Supabase.' };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        hd: config.domain,
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) {
    return { error: error.message };
  }
  if (data?.url) {
    return { url: data.url };
  }
  return { error: 'Google OAuth is not configured in Supabase.' };
}
