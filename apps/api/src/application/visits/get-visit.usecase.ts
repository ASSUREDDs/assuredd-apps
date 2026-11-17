import { Inject, Injectable } from '@nestjs/common';

import { err, ok, type Result } from '@domain/shared/result';
import { VisitNotFoundError } from '@domain/visits/domain-error';
import type { Visit } from '@domain/visits/visit.entity';
import { VISIT_REPOSITORY, type VisitRepository } from '@domain/visits/visit.repository';

@Injectable()
export class GetVisitUseCase {
    constructor(@Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository) {}

    async execute(tenantId: string, courierId: string, id: string): Promise<Result<Visit, VisitNotFoundError>> {
        const visit = await this.visits.find(tenantId, courierId, id);
        return visit ? ok(visit) : err(new VisitNotFoundError());
    }
}
