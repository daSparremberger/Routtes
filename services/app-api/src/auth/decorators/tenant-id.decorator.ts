import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@routtes/shared';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const user = ctx.switchToHttp().getRequest().user as JwtPayload;
    return user.tenantId as string;
  },
);
