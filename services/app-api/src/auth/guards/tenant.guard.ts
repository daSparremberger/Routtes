import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@routtes/shared';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as JwtPayload;

    if (user?.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('SuperAdmin cannot access operational resources');
    }

    if (!user?.tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }

    return true;
  }
}
