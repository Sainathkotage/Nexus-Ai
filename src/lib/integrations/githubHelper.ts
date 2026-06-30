import crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { CredentialVault } from './vault';

/**
 * Generates an RS256 JWT for GitHub App authentication using native Node.js crypto.
 * No external JWT dependencies required.
 */
export function generateAppJWT(appId: string, privateKeyPem: string): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,         // 60-second buffer for clock skew
    exp: now + 540,        // 9-minute lifetime (max allowed is 10 minutes)
    iss: appId,            // GitHub App ID
  };

  const base64UrlEncode = (obj: any) => {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(privateKeyPem, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Exchanges a GitHub App JWT for a short-lived Installation Access Token (IAT).
 */
export async function getInstallationAccessToken(installationId: string): Promise<{ token: string; expiresAt: string }> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY; // Base64-encoded or raw PEM string

  if (!appId || !privateKey) {
    throw new Error('[GitHubHelper] GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is not configured');
  }

  // Handle base64 encoded private keys (common in hosting environments like Vercel)
  const decodedPrivateKey = privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')
    ? privateKey
    : Buffer.from(privateKey, 'base64').toString('utf8');

  const jwt = generateAppJWT(appId, decodedPrivateKey);

  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Nexus-AI-Integration',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[GitHubHelper] Failed to exchange installation token: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

/**
 * Encrypts and stores GitHub token payload to credentials table in Supabase.
 */
export async function saveGitHubCredentials(integrationId: string, tokenPayload: any): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const serialized = JSON.stringify(tokenPayload);
  const { encryptedData, iv } = CredentialVault.encrypt(serialized);

  const { error } = await supabase
    .from('credentials')
    .insert({
      integration_id: integrationId,
      encrypted_data: encryptedData,
      iv: iv,
      auth_fields: {
        token_type: tokenPayload.token_type || 'bearer',
        scopes: tokenPayload.scope || '',
        refreshed_at: new Date().toISOString(),
      },
    });

  if (error) {
    throw new Error(`[GitHubHelper] Failed to save credentials: ${error.message}`);
  }
}

/**
 * Retrieves and decrypts GitHub token credentials for a given integration ID.
 */
export async function getDecryptedGitHubCredentials(integrationId: string): Promise<any> {
  const supabase = createSupabaseAdminClient();

  const { data: credential, error } = await supabase
    .from('credentials')
    .select('*')
    .eq('integration_id', integrationId)
    .maybeSingle();

  if (error || !credential) {
    throw new Error(`[GitHubHelper] Credentials not found: ${error?.message || 'Empty result'}`);
  }

  const decrypted = CredentialVault.decrypt(credential.encrypted_data, credential.iv);
  return JSON.parse(decrypted);
}

/**
 * Refreshes the user OAuth access token if expired.
 */
export async function refreshUserAccessToken(refreshToken: string): Promise<any> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('[GitHubHelper] GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Nexus-AI-Integration',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[GitHubHelper] Token refresh failed: ${errText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`[GitHubHelper] GitHub returned token refresh error: ${data.error_description || data.error}`);
  }

  return data;
}
