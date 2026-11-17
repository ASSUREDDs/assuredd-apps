import { Inject, Injectable } from '@nestjs/common';

import type { LngLat } from '@domain/shared/geo';
import { err, ok, type Result } from '@domain/shared/result';
import { VisitIdTakenError, VisitNotFoundError } from '@domain/visits/domain-error';
import type { Visit } from '@domain/visits/visit.entity';
import { VISIT_REPOSITORY, type VisitRepository } from '@domain/visits/visit.repository';

export interface StartVisitInput {
    tenantId: string;
    courierId: string;
    id: string;
    destination: LngLat;
    label?: string;
    startedAt: Date;
}

@Injectable()
export class StartVisitUseCase {
    constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

    async execute(input: StartVisitInput): Promise<Result<Visit, VisitIdTakenError | VisitNotFoundError>> {
        const outcome = await this.visits.create({
            id: input.id,
            tenantId: input.tenantId,
            courierId: input.courierId,
            destination: input.destination,
            label: input.label?.length ? input.label : null,
            startedAt: input.startedAt,
        });
        if (outcome === 'taken') return err(new VisitIdTakenError());

        const visit = await this.visits.find(input.tenantId, input.courierId, input.id);
        return visit ? ok(visit) : err(new VisitNotFoundError());
    }
}
