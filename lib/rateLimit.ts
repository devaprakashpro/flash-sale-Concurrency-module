import { getRedisClient } from './redis';
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

export async function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const redis = await getRedisClient();
  const key = `rate_limit:${options.identifier}`;
  
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      // First request in this window, set expiration
      await redis.expire(key, Math.ceil(options.windowMs / 1000));
    }
    
    if (current > options.maxRequests) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl > 0 ? ttl : Math.ceil(options.windowMs / 1000),
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is down
    return { allowed: true };
  }
}

export async function rateLimitMiddleware(
  req: NextRequest,
  maxRequests: number,
  windowMs: number = 60000,
  userId?: string
) {
  // Get user ID from parameter, query, or use IP as fallback
  const finalUserId = userId || 
                      req.nextUrl.searchParams.get('userId') || 
                      'anonymous';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // Check user-based rate limit
  const userLimit = await checkRateLimit(req, {
    maxRequests,
    windowMs,
    identifier: `user:${finalUserId}`,
  });
  
  if (!userLimit.allowed) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded for user' },
      {
        status: 429,
        headers: {
          'Retry-After': String(userLimit.retryAfter || 60),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  
  // Check IP-based rate limit (10 requests per minute)
  const ipLimit = await checkRateLimit(req, {
    maxRequests: 10,
    windowMs: 60000,
    identifier: `ip:${ip}`,
  });
  
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded for IP' },
      {
        status: 429,
        headers: {
          'Retry-After': String(ipLimit.retryAfter || 60),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  
  return null; // No rate limit violation
}

