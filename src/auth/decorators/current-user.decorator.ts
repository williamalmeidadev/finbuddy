import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUserDto } from '../dto/authenticated-user.dto';

export function getCurrentUser(ctx: ExecutionContext): AuthenticatedUserDto {
  const request = ctx
    .switchToHttp()
    .getRequest<{ user: AuthenticatedUserDto }>();

  return request.user;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUserDto => {
    return getCurrentUser(ctx);
  },
);
