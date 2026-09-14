import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface RequestWithUser {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  user?: { id?: string; sub?: string };
}

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const isRateLimitDisabled =
      process.env.DISABLE_RATE_LIMIT === 'true' ||
      (process.env.THROTTLE_LIMIT &&
        Number(process.env.THROTTLE_LIMIT) >= 1000);
    if (isRateLimitDisabled) {
      return true;
    }
    return super.shouldSkip(context);
  }
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as unknown as RequestWithUser;
    const xff = r.headers?.['x-forwarded-for'];
    let headerIp: string | undefined;

    if (typeof xff === 'string') {
      headerIp = xff.split(',')[0].trim();
    } else if (Array.isArray(xff) && xff.length > 0) {
      headerIp = xff[0].trim();
    }

    const ip = r.ip || headerIp || r.socket?.remoteAddress || '127.0.0.1';
    const userId = r.user?.id || r.user?.sub;

    const tracker = userId ? `${userId}:${ip}` : ip;
    return Promise.resolve(tracker);
  }
}
