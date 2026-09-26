import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import type { AccessTokenPayload } from '@application/auth/ports/token.port';
import { TOKEN_SERVICE, type TokenService } from '@application/auth/ports/token.port';

interface HttpRequestLike {
    headers: { authorization?: string };
    user?: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<HttpRequestLike>();
        const header = request.headers.authorization;
        if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();

        try {
            request.user = this.tokens.verifyAccessToken(header.slice('Bearer '.length));
            return true;
        } catch {
            throw new UnauthorizedException();
        }
    }
}
