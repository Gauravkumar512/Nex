import { NextFunction, Request, Response } from 'express';
import redis from '../config/redis';
import { AuthenticatedRequest } from './auth.middleware';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
  failClosed?: boolean;
}

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local expireSeconds = tonumber(ARGV[4])
local member = ARGV[5]

-- Drop entries that fell out of the back of the sliding window.
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

local count = redis.call('ZCARD', key)

if count < max then
  redis.call('ZADD', key, now, member)
  redis.call('EXPIRE', key, expireSeconds)
  return { 1, count + 1 }
end

return { 0, count }
`;

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, keyPrefix, message } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const identifier = (req as AuthenticatedRequest).userId ?? req.ip ?? 'unknown';
    const key = `ratelimit:${keyPrefix}:${identifier}`;

    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2)}`;

    try {
      const [allowed, count] = (await redis.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        key,
        now.toString(),
        windowStart.toString(),
        max.toString(),
        windowSeconds.toString(),
        member
      )) as [number, number];

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

      if (allowed === 1) {
        return next();
      }

      res.setHeader('Retry-After', windowSeconds);
      res.status(429).json({
        error: 'Too many requests',
        message,
        retryAfter: `${windowSeconds} seconds`,
      });
      return;
    } catch (error) {

      console.error(`[rateLimiter] Redis error for key "${key}":`, error);
      if(options.failClosed){
        res.status(503).json({
          error: "Service temporarily unavailable",
          message: 'Login is temporarily unavailable. Please try again shortly.',
        });
        return;
      }
      return next();
    }
  };
}

export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: 'general',
  message: 'Too many requests. Please slow down.',
  failClosed: false,
});

export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'ai',
  message: 'Too many AI requests. Wait a minute before trying again.',
  failClosed: true,
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'auth',
  message: 'Too many login attempts. Try again in 15 minutes.',
  failClosed: true,
});
