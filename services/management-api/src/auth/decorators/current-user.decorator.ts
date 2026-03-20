import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@routtes/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
