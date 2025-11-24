import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { ip, method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      this.logger.log(
        `[Request] ${method} ${originalUrl} - IP: ${ip} - Status: ${statusCode} - Duration: ${duration}ms`,
        RequestLoggerMiddleware.name,
      );
    });

    next();
  }
}
