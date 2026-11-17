import { Inject, Injectable } from '@nestjs/common';

import { err, ok, type Result } from '@domain/shared/result';
import { VisitNotFoundError } from '@domain/visits/domain-error';
import type { Visit, VisitEventType } from '@domain/visits/visit.entity';
import { VISIT_REPOSITORY, type VisitRepository } from '@domain/visits/visit.repository';

export interface RecordVisitEventInput {
    tenantId: string;
    courierId: string;
    visitId: string;
    type: VisitEventType;
    at: Date;
}

@Injectable()
export class RecordVisitEventUseCase {
    constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

    async execute(input: RecordVisitEventInput): Promise<Result<Visit, VisitNotFoundError>> {
        const visit = await this.visits.applyEvent(input.tenantId, input.courierId, input.visitId, input.type, input.at);
        return visit ? ok(visit) : err(new VisitNotFoundError());
    }
}
