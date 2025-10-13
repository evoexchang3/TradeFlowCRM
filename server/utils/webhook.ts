import crypto from 'crypto';

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify HMAC signature from webhook request
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Get or create webhook secret
 */
export function getWebhookSecret(): string {
  if (!process.env.SITE_WEBHOOK_SECRET) {
    // Generate a secure random secret if not provided
    const secret = crypto.randomBytes(32).toString('hex');
    console.warn(`⚠️  SITE_WEBHOOK_SECRET not set. Using generated secret: ${secret}`);
    console.warn('   Add this to your .env file for production use.');
    return secret;
  }
  return process.env.SITE_WEBHOOK_SECRET;
}
