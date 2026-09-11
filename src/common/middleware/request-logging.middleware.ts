import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      const reqWithProps = req as Request & {
        requestId?: string;
        user?: { id?: string };
      };
      const requestId = reqWithProps.requestId || 'N/A';
      const userId = reqWithProps.user?.id;

      const logPayload: Record<string, unknown> = {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode,
        durationMs,
      };
      if (userId) {
        logPayload.userId = userId;
      }

      const message = JSON.stringify(logPayload);

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
