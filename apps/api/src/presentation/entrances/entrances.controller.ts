import type { Entrance, EntranceListResponse } from '@app/contracts';
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

import type { Entrance as EntranceEntity } from '@domain/entrances/entrance.entity';
import type { AccessTokenPayload } from '@application/auth/ports/token.port';
import { CreateEntranceUseCase } from '@application/entrances/create-entrance.usecase';
import { RemoveEntranceUseCase } from '@application/entrances/remove-entrance.usecase';
import { SearchEntrancesUseCase } from '@application/entrances/search-entrances.usecase';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { Idempotent } from '../shared/idempotency.interceptor';
import { CreateEntranceDto, SearchEntrancesQueryDto } from './dto/entrance.dto';

function toResponse(entrance: EntranceEntity): Entrance {
    return { ...entrance, createdAt: entrance.createdAt.toISOString() };
}

@Controller('entrances')
@UseGuards(JwtAuthGuard)
export class EntrancesController {
    constructor(
        private readonly createEntrance: CreateEntranceUseCase,
        private readonly searchEntrances: SearchEntrancesUseCase,
        private readonly removeEntrance: RemoveEntranceUseCase,
        private readonly errors: DomainErrorHttpMapper,
    ) {}

    @Post()
    @Idempotent()
    async create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateEntranceDto): Promise<Entrance> {
        const created = await this.createEntrance.execute({
            tenantId: user.tenantId,
            userId: user.sub,
            house: dto.house,
            entrance: dto.entrance,
            label: dto.label,
            comment: dto.comment,
        });

        return toResponse(created);
    }

    @Get()
    async search(
        @CurrentUser() user: AccessTokenPayload,
        @Query() query: SearchEntrancesQueryDto,
    ): Promise<EntranceListResponse> {
        const items = await this.searchEntrances.execute(user.tenantId, [query.lng, query.lat], query.radiusM);
        return { items: items.map(toResponse) };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
        const result = await this.removeEntrance.execute({
            tenantId: user.tenantId,
            userId: user.sub,
            role: user.role,
            entranceId: id,
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);
    }
}
