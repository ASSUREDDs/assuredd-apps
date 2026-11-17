import type { TrackBatchResponse, Visit as VisitResponse } from '@app/contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';

import type { LngLat } from '@domain/shared/geo';
import type { Visit } from '@domain/visits/visit.entity';
import type { AccessTokenPayload } from '@application/auth/ports/token.port';
import { AddTrackPointsUseCase } from '@application/visits/add-track-points.usecase';
import { GetVisitUseCase } from '@application/visits/get-visit.usecase';
import { RecordVisitEventUseCase } from '@application/visits/record-visit-event.usecase';
import { StartVisitUseCase } from '@application/visits/start-visit.usecase';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { Idempotent } from '../shared/idempotency.interceptor';
import { StartVisitDto, TrackBatchDto, VisitEventDto } from './dto/visit.dto';

function toResponse(visit: Visit): VisitResponse {
    return {
        id: visit.id,
        destination: visit.destination,
        label: visit.label,
        status: visit.status,
        startedAt: visit.startedAt.toISOString(),
        arrivedAt: visit.arrivedAt?.toISOString() ?? null,
        doorAt: visit.doorAt?.toISOString() ?? null,
        finishedAt: visit.finishedAt?.toISOString() ?? null,
        pointCount: visit.pointCount,
    };
}

@Controller('visits')
@UseGuards(JwtAuthGuard)
export class VisitsController {
    constructor(
        private readonly startVisit: StartVisitUseCase,
        private readonly getVisit: GetVisitUseCase,
        private readonly recordEvent: RecordVisitEventUseCase,
        private readonly addPoints: AddTrackPointsUseCase,
        private readonly errors: DomainErrorHttpMapper,
    ) {}

    @Post()
    @Idempotent()
    async start(@CurrentUser() user: AccessTokenPayload, @Body() dto: StartVisitDto): Promise<VisitResponse> {
        const result = await this.startVisit.execute({
            tenantId: user.tenantId,
            courierId: user.sub,
            id: dto.id,
            destination: dto.destination as LngLat,
            label: dto.label,
            startedAt: new Date(dto.startedAt),
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toResponse(result.value);
    }

    @Get(':id')
    async get(@CurrentUser() user: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string): Promise<VisitResponse> {
        const result = await this.getVisit.execute(user.tenantId, user.sub, id);
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toResponse(result.value);
    }

    // The first report of an event wins and a finished visit does not change, so repeating this is harmless.
    @Post(':id/events')
    @HttpCode(HttpStatus.OK)
    async event(
        @CurrentUser() user: AccessTokenPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: VisitEventDto,
    ): Promise<VisitResponse> {
        const result = await this.recordEvent.execute({
            tenantId: user.tenantId,
            courierId: user.sub,
            visitId: id,
            type: dto.type,
            at: new Date(dto.at),
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toResponse(result.value);
    }

    @Post(':id/points')
    @Idempotent()
    @HttpCode(HttpStatus.OK)
    async points(
        @CurrentUser() user: AccessTokenPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: TrackBatchDto,
    ): Promise<TrackBatchResponse> {
        const result = await this.addPoints.execute({
            tenantId: user.tenantId,
            courierId: user.sub,
            visitId: id,
            points: dto.points.map((point) => ({
                at: new Date(point.at),
                position: point.position as LngLat,
                accuracyM: point.accuracyM ?? null,
            })),
        });
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return result.value;
    }
}
