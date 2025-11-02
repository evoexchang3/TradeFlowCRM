import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Initialize Redis client (optional - only if REDIS_URL is configured)
 */
export function initializeRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.log('[Redis] Not configured - sessions will use in-memory store');
    return null;
  }

  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    return redisClient;
  } catch (error: any) {
    console.error('[Redis] Initialization failed:', error.message);
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', closeRedis);
process.on('SIGINT', closeRedis);
