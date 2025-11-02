import type { Request, Response } from 'express';
import { pool } from './db';
import { getRedisClient } from './redis';

/**
 * Liveness endpoint - checks if the process is running
 */
export async function livenessCheck(req: Request, res: Response) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}

/**
 * Readiness endpoint - checks if the app can serve traffic
 * Verifies database and Redis connectivity
 */
export async function readinessCheck(req: Request, res: Response) {
  const checks: Record<string, { status: string; message?: string }> = {};
  let overallStatus = 200;

  // Check database
  try {
    const result = await pool.query('SELECT 1');
    checks.database = { status: 'ok' };
  } catch (error: any) {
    checks.database = { status: 'error', message: error.message };
    overallStatus = 503;
  }

  // Check Redis (optional - only if Redis is enabled)
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
        checks.redis = { status: 'ok' };
      } else {
        checks.redis = { status: 'disabled' };
      }
    } catch (error: any) {
      checks.redis = { status: 'error', message: error.message };
      overallStatus = 503;
    }
  } else {
    checks.redis = { status: 'not_configured' };
  }

  res.status(overallStatus).json({
    status: overallStatus === 200 ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
}
