import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const rawHeader = req.header('x-request-id');
    let requestId: string;

    if (rawHeader && /^[a-zA-Z0-9_-]{1,64}$/.test(rawHeader)) {
      requestId = rawHeader;
    } else {
      requestId = randomUUID();
    }

    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
