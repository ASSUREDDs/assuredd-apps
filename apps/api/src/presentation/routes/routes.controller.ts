import type { CheckRouteResponse, RoutePlan } from '@app/contracts';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import type { AccessTokenPayload } from '@application/auth/ports/token.port';
import { BuildRouteUseCase } from '@application/routing/build-route.usecase';
import { CheckRouteUseCase } from '@application/routing/check-route.usecase';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { CheckRouteRequestDto, RouteRequestDto } from './dto/route.dto';
import { toCheckRouteResponse, toRoutePlanResponse } from './route-response.mapper';

// POST only because the body carries coordinates; neither endpoint changes anything.
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
    constructor(
        private readonly buildRoute: BuildRouteUseCase,
        private readonly checkRoute: CheckRouteUseCase,
        private readonly errors: DomainErrorHttpMapper,
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    async build(@CurrentUser() user: AccessTokenPayload, @Body() dto: RouteRequestDto): Promise<RoutePlan> {
        const result = await this.buildRoute.execute({
            tenantId: user.tenantId,
            from: dto.from,
            to: dto.to,
            useEntrance: dto.useEntrance,
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toRoutePlanResponse(result.value);
    }

    @Post('check')
    @HttpCode(HttpStatus.OK)
    async check(@CurrentUser() user: AccessTokenPayload, @Body() dto: CheckRouteRequestDto): Promise<CheckRouteResponse> {
        const result = await this.checkRoute.execute({
            tenantId: user.tenantId,
            from: dto.from,
            to: dto.to,
            useEntrance: dto.useEntrance,
            known: dto.known,
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toCheckRouteResponse(result.value);
    }
}
