import crypto from 'crypto';
import { storage } from '../storage';
import { WebhookEndpoint, type InsertWebhookDelivery } from '@shared/schema';

export type WebhookEvent = 
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'client.ftd'
  | 'position.opened'
  | 'position.updated'
  | 'position.closed'
  | 'trade.executed'
  | 'deposit.completed'
  | 'withdrawal.completed';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}

function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

async function deliverWebhook(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload,
  attemptNumber: number = 1
): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, endpoint.secret);
  
  const startTime = Date.now();
  let success = false;
  let httpStatus: number | null = null;
  let responseBody = '';
  let errorMessage: string | null = null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'User-Agent': 'CRM-Webhook-Service/1.0',
      ...(endpoint.headers as Record<string, string> || {}),
    };

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    httpStatus = response.status;
    const responseText = await response.text();
    responseBody = responseText.slice(0, 1000); // Truncate to 1000 chars

    success = response.ok; // 2xx status codes

    if (!success) {
      errorMessage = `HTTP ${httpStatus}: ${responseBody}`;
    }
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    console.error(`[Webhook] Delivery failed to ${endpoint.url}:`, error);
  }

  const responseTime = Date.now() - startTime;

  // Log the delivery attempt with full payload
  const deliveryLog: InsertWebhookDelivery = {
    endpointId: endpoint.id,
    event: payload.event,
    payload: payload, // Store full payload (event, timestamp, data)
    httpStatus,
    responseBody,
    responseTime,
    attemptNumber,
    success,
    errorMessage,
  };

  await storage.createWebhookDelivery(deliveryLog);

  // Update endpoint's last delivery status
  await storage.updateWebhookEndpoint(endpoint.id, {
    lastDeliveryAt: new Date(),
    lastDeliveryStatus: success ? 'success' : 'failed',
    status: success ? 'active' : (attemptNumber >= endpoint.retryAttempts ? 'failed' : endpoint.status),
  });

  // Retry logic
  if (!success && attemptNumber < endpoint.retryAttempts) {
    console.log(`[Webhook] Retrying delivery to ${endpoint.url} (attempt ${attemptNumber + 1}/${endpoint.retryAttempts})`);
    
    // Wait before retry (exponential backoff)
    const delayMs = endpoint.retryDelay * 1000 * Math.pow(2, attemptNumber - 1);
    setTimeout(async () => {
      await deliverWebhook(endpoint, payload, attemptNumber + 1);
    }, delayMs);
  }
}

export async function triggerWebhookEvent(event: WebhookEvent, data: any): Promise<void> {
  try {
    // Get all active webhook endpoints subscribed to this event
    const endpoints = await storage.getWebhookEndpoints();
    const subscribedEndpoints = endpoints.filter(
      (endpoint) => 
        endpoint.status === 'active' && 
        Array.isArray(endpoint.events) && 
        (endpoint.events as string[]).includes(event)
    );

    if (subscribedEndpoints.length === 0) {
      return; // No subscribers for this event
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    console.log(`[Webhook] Triggering event '${event}' to ${subscribedEndpoints.length} endpoint(s)`);

    // Deliver webhooks in parallel (don't await all)
    subscribedEndpoints.forEach(endpoint => {
      deliverWebhook(endpoint, payload).catch(error => {
        console.error(`[Webhook] Failed to deliver to ${endpoint.url}:`, error);
      });
    });
  } catch (error) {
    console.error('[Webhook] Error triggering webhook event:', error);
  }
}
