import { Inject, Injectable } from '@nestjs/common';

import { err, ok, type Result } from '@domain/shared/result';
import { VisitNotFoundError } from '@domain/visits/domain-error';
import type { TrackPoint } from '@domain/visits/visit.entity';
import { VISIT_REPOSITORY, type VisitRepository } from '@domain/visits/visit.repository';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

/** A phone clock slightly ahead of the server is normal; a timestamp hours ahead is not a real point. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface AddTrackPointsInput {
    tenantId: string;
    courierId: string;
    visitId: string;
    points: TrackPoint[];
}

@Injectable()
export class AddTrackPointsUseCase {
    constructor(
        @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    async execute(input: AddTrackPointsInput): Promise<Result<{ accepted: number; ignored: number }, VisitNotFoundError>> {
        const visit = await this.visits.find(input.tenantId, input.courierId, input.visitId);
        if (!visit) return err(new VisitNotFoundError());

        const latest = this.clock.now().getTime() + FUTURE_TOLERANCE_MS;
        const usable = input.points.filter((point) => point.at.getTime() <= latest);

        const accepted = usable.length > 0 ? await this.visits.addPoints(input.tenantId, input.courierId, input.visitId, usable) : 0;
        return ok({ accepted, ignored: input.points.length - usable.length });
    }
}
