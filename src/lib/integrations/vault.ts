import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Master key fallback if not configured (should be 32 bytes hex)
const MASTER_KEY = process.env.NEXUS_VAULT_MASTER_KEY 
  ? Buffer.from(process.env.NEXUS_VAULT_MASTER_KEY, 'hex')
  : crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'nexus-default-vault-key-secret-1234', 'salt', 32);

interface EncryptedPayload {
  encryptedData: string;
  iv: string;
}

/**
 * Vault Service to encrypt and decrypt sensitive third-party auth credentials.
 */
export class CredentialVault {
  /**
   * Encrypt raw data string using AES-256-GCM.
   */
  static encrypt(rawData: string): EncryptedPayload {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
    
    let encrypted = cipher.update(rawData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      encryptedData: `${encrypted}:${authTag}`,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt encrypted payload using AES-256-GCM.
   */
  static decrypt(encryptedData: string, ivHex: string): string {
    const parts = encryptedData.split(':');
    const ciphertext = parts[0];
    const authTag = parts[1];

    if (!ciphertext || !authTag) {
      throw new Error('[Vault] Invalid encrypted payload format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
