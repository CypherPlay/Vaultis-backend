import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { GUESS_SUBMIT_RATE_LIMIT_CONFIG } from './rate-limit.config';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
  });

  private guessSubmitLimiter = rateLimit({
    windowMs: GUESS_SUBMIT_RATE_LIMIT_CONFIG.ttl,
    max: GUESS_SUBMIT_RATE_LIMIT_CONFIG.limit,
    message: 'Too many guess attempts from this IP, please try again shortly',
  });

  use(req: Request, res: Response, next: NextFunction) {
    if (req.originalUrl === '/api/guesses/submit') {
      this.guessSubmitLimiter(req, res, next);
    } else {
      this.defaultLimiter(req, res, next);
    }
  }
}
