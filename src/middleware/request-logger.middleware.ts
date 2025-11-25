import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';
import * as ipaddr from 'ipaddr.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.DISABLE_IP_LOGGING === 'true') {
      this.logger.log('[Request] IP logging disabled by configuration.', RequestLoggerMiddleware.name);
      return next();
    }

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
      return (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0]).trim();
    }
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return (Array.isArray(xRealIp) ? xRealIp[0] : xRealIp.split(',')[0]).trim();
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
      try {
        const addr = ipaddr.parse(ip);
        if (addr.kind() === 'ipv6') {
          // Mask the last 5 hextets (80 bits)
          for (let i = 3; i <= 7; i++) {
            addr.parts[i] = 0;
          }
          return addr.toString();
        }
      } catch (error) {
        // If parsing fails, treat as unknown or return original IP
        this.logger.warn(`Failed to parse IPv6 address ${ip}: ${error.message}`, RequestLoggerMiddleware.name);
        return ip;
      }
    }
    return ip;
  }
}
