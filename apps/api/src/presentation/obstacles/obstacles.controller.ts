import type { Obstacle, ObstacleListResponse } from '@app/contracts';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import type { SearchArea } from '@domain/obstacles/obstacle.repository';
import type { AccessTokenPayload } from '@application/auth/ports/token.port';
import { CreateObstacleUseCase } from '@application/obstacles/create-obstacle.usecase';
import { RemoveObstacleUseCase } from '@application/obstacles/remove-obstacle.usecase';
import { SearchObstaclesUseCase } from '@application/obstacles/search-obstacles.usecase';
import { VoteObstacleUseCase } from '@application/obstacles/vote-obstacle.usecase';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { Idempotent } from '../shared/idempotency.interceptor';
import { CreateObstacleDto, SearchObstaclesQueryDto, VoteObstacleDto } from './dto/obstacle.dto';
import { toObstacleResponse } from './obstacle-response.mapper';

@Controller('obstacles')
@UseGuards(JwtAuthGuard)
export class ObstaclesController {
    constructor(
        private readonly createObstacle: CreateObstacleUseCase,
        private readonly searchObstacles: SearchObstaclesUseCase,
        private readonly voteObstacle: VoteObstacleUseCase,
        private readonly removeObstacle: RemoveObstacleUseCase,
        private readonly errors: DomainErrorHttpMapper,
    ) {}

    @Post()
    @Idempotent()
    async create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateObstacleDto): Promise<Obstacle> {
        const shape =
            dto.shape.type === 'circle'
                ? dto.shape
                : { type: 'polygon' as const, ring: dto.shape.polygon.coordinates[0] };

        const result = await this.createObstacle.execute({
            tenantId: user.tenantId,
            userId: user.sub,
            kind: dto.kind,
            shape,
            comment: dto.comment,
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toObstacleResponse(result.value);
    }

    @Get()
    async search(
        @CurrentUser() user: AccessTokenPayload,
        @Query() query: SearchObstaclesQueryDto,
    ): Promise<ObstacleListResponse> {
        const area: SearchArea = query.bbox
            ? { type: 'bbox', ...query.bbox }
            : { type: 'radius', center: [query.lng!, query.lat!], radiusM: query.radiusM! };

        const items = await this.searchObstacles.execute({
            tenantId: user.tenantId,
            userId: user.sub,
            area,
            kinds: query.kind,
        });

        return { items: items.map(toObstacleResponse) };
    }

    @Post(':id/votes')
    @Idempotent()
    @HttpCode(HttpStatus.OK)
    async vote(
        @CurrentUser() user: AccessTokenPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: VoteObstacleDto,
    ): Promise<Obstacle> {
        const result = await this.voteObstacle.execute({
            tenantId: user.tenantId,
            userId: user.sub,
            obstacleId: id,
            vote: dto.vote,
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toObstacleResponse(result.value);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
        const result = await this.removeObstacle.execute({
            tenantId: user.tenantId,
            userId: user.sub,
            role: user.role,
            obstacleId: id,
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);
    }
}
