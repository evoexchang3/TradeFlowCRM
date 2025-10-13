import crypto from 'crypto';
import bcrypt from 'bcrypt';

export function generateApiKey(): {
  key: string;
  keyHash: string;
  keyPrefix: string;
} {
  // Generate 32 random bytes and convert to base64url
  const randomBytes = crypto.randomBytes(32);
  const key = `sk_${randomBytes.toString('base64url')}`;
  
  // Hash the key for storage (using bcrypt for consistency with passwords)
  const keyHash = bcrypt.hashSync(key, 10);
  
  // Store first 12 characters as prefix for display
  const keyPrefix = key.substring(0, 12);
  
  return {
    key,
    keyHash,
    keyPrefix,
  };
}

export function verifyApiKey(key: string, keyHash: string): boolean {
  return bcrypt.compareSync(key, keyHash);
}

export function isIpAllowed(ip: string, whitelist: string[] | null): boolean {
  // If no whitelist, allow all
  if (!whitelist || whitelist.length === 0) {
    return true;
  }
  
  // Check if IP is in whitelist
  return whitelist.includes(ip);
}
