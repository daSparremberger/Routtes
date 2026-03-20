import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '@routtes/shared';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const user = ctx.switchToHttp().getRequest().user as JwtPayload;
    if (!user?.tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return user.tenantId;
  },
);
