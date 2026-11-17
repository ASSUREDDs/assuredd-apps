import { Module } from '@nestjs/common';

import { VISIT_REPOSITORY } from '@domain/visits/visit.repository';
import { CLOCK } from '@application/shared/ports/clock.port';
import { AddTrackPointsUseCase } from '@application/visits/add-track-points.usecase';
import { GetVisitUseCase } from '@application/visits/get-visit.usecase';
import { RecordVisitEventUseCase } from '@application/visits/record-visit-event.usecase';
import { StartVisitUseCase } from '@application/visits/start-visit.usecase';
import { SystemClock } from '@infrastructure/shared/system-clock';
import { DrizzleVisitRepository } from '@infrastructure/visits/drizzle-visit.repository';
import { TrackRetentionJob } from '@infrastructure/visits/track-retention.job';

import { AuthModule } from '../auth/auth.module';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { VisitsController } from './visits.controller';

@Module({
    imports: [AuthModule],
    controllers: [VisitsController],
    providers: [
        StartVisitUseCase,
        GetVisitUseCase,
        RecordVisitEventUseCase,
        AddTrackPointsUseCase,
        TrackRetentionJob,
        DomainErrorHttpMapper,
        { provide: VISIT_REPOSITORY, useClass: DrizzleVisitRepository },
        { provide: CLOCK, useClass: SystemClock },
    ],
})
export class VisitsModule {}
