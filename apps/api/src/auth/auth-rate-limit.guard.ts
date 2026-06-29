import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

type RequestLike = {
  body?: {
    email?: unknown;
  };
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  route?: {
    path?: string;
  };
  socket?: {
    remoteAddress?: string;
  };
  url?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, RateLimitBucket>();
  private static readonly windowMs = 15 * 60 * 1000;
  private static readonly defaultLimit = 10;
  private static readonly forgotPasswordLimit = 5;

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const now = Date.now();
    const route = this.routeKey(request);
    const limit = route.includes('forgot-password')
      ? AuthRateLimitGuard.forgotPasswordLimit
      : AuthRateLimitGuard.defaultLimit;
    const key = `${route}:${this.clientKey(request)}`;
    const bucket = AuthRateLimitGuard.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      AuthRateLimitGuard.buckets.set(key, {
        count: 1,
        resetAt: now + AuthRateLimitGuard.windowMs,
      });
      this.cleanupExpiredBuckets(now);
      return true;
    }

    bucket.count += 1;

    if (bucket.count > limit) {
      const retryMinutes = Math.max(1, Math.ceil((bucket.resetAt - now) / 60000));
      throw new HttpException(
        `Too many authentication attempts. Please try again in ${retryMinutes} minute${
          retryMinutes === 1 ? '' : 's'
        }.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private routeKey(request: RequestLike) {
    return request.route?.path ?? request.url ?? 'auth';
  }

  private clientKey(request: RequestLike) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ip =
      forwardedIp?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';
    const email = this.normalizedEmail(request.body?.email);

    return email ? `${ip}:${email}` : ip;
  }

  private normalizedEmail(value: unknown) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  }

  private cleanupExpiredBuckets(now: number) {
    if (AuthRateLimitGuard.buckets.size < 1000) {
      return;
    }

    for (const [key, bucket] of AuthRateLimitGuard.buckets.entries()) {
      if (bucket.resetAt <= now) {
        AuthRateLimitGuard.buckets.delete(key);
      }
    }
  }
}
