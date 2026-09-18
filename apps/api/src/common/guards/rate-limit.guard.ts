import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface RequestWithUser {
  ip?: string;
  ips?: string[];
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  user?: { id?: string; sub?: string };
}

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true';
    if (isRateLimitDisabled) {
      return true;
    }
    return super.shouldSkip(context);
  }

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as unknown as RequestWithUser;
    const ip =
      r.ip ||
      (r.ips && r.ips.length > 0 ? r.ips[0] : undefined) ||
      r.socket?.remoteAddress ||
      '127.0.0.1';
    const userId = r.user?.id || r.user?.sub;

    const tracker = userId ? `${userId}:${ip}` : ip;
    return Promise.resolve(tracker);
  }
}
