import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as xss from 'xss';

@Injectable()
export class SanitizeInputInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.body) {
      this.sanitize(request.body);
    }
    if (request.query) {
      this.sanitize(request.query);
    }
    if (request.params) {
      this.sanitize(request.params);
    }
    return next.handle().pipe(map((data) => data));
  }

  private sanitize(input: any): void {
    for (const key in input) {
      if (typeof input[key] === 'string') {
        input[key] = xss(input[key]);
      } else if (typeof input[key] === 'object' && input[key] !== null) {
        this.sanitize(input[key]);
      }
    }
  }
}
