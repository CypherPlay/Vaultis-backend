import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assuming user is attached to the request after authentication

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('User is not authorized to access this resource.');
    }

    return true;
  }
}
