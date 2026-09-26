import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AccessTokenPayload } from '@application/auth/ports/token.port';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: AccessTokenPayload }>();
    return request.user;
});
