import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;
    const clientIp = this.anonymizeIp(this.getClientIp(req));

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      this.logger.log(
        `[Request] ${method} ${originalUrl} - IP: ${clientIp} - Status: ${statusCode} - Duration: ${duration}ms`,
        RequestLoggerMiddleware.name,
      );
    });

    next();
  }

  private getClientIp(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      return Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
    }
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp.split(',')[0];
    }
    if (req.ip) {
      return req.ip;
    }
    if (req.socket && req.socket.remoteAddress) {
      return req.socket.remoteAddress;
    }
    return 'unknown';
  }

  private anonymizeIp(ip: string): string {
    if (ip === 'unknown') {
      return ip;
    }
    // IPv4: Mask the last octet
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = 'xxx';
        return parts.join('.');
      }
    }
    // IPv6: Mask the last 80 bits (last 5 hextets)
    if (ip.includes(':')) {
      const parts = ip.split(':');
      // A full IPv6 address has 8 parts. We want to mask the last 5.
      // This means keeping the first 3 parts.
      if (parts.length > 3) {
        return parts.slice(0, 3).join(':') + ':xxxx:xxxx:xxxx:xxxx:xxxx';
      }
    }
    return ip;
  }
}
