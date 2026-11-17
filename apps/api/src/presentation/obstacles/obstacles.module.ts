import { MAX_OBSTACLE_AREA_M2 } from '@app/contracts';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OBSTACLE_REPOSITORY } from '@domain/obstacles/obstacle.repository';
import { CreateObstacleUseCase } from '@application/obstacles/create-obstacle.usecase';
import { OBSTACLE_POLICY, type ObstaclePolicy } from '@application/obstacles/ports/obstacle-policy.port';
import { RemoveObstacleUseCase } from '@application/obstacles/remove-obstacle.usecase';
import { SearchObstaclesUseCase } from '@application/obstacles/search-obstacles.usecase';
import { VoteObstacleUseCase } from '@application/obstacles/vote-obstacle.usecase';
import { CLOCK } from '@application/shared/ports/clock.port';
import { ID_GENERATOR } from '@application/shared/ports/id-generator.port';
import type { Env } from '@infrastructure/config';
import { DrizzleObstacleRepository } from '@infrastructure/obstacles/drizzle-obstacle.repository';
import { ObstacleExpiryJob } from '@infrastructure/obstacles/obstacle-expiry.job';
import { CryptoIdGenerator } from '@infrastructure/shared/crypto-id-generator';
import { SystemClock } from '@infrastructure/shared/system-clock';

import { AuthModule } from '../auth/auth.module';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { ObstaclesController } from './obstacles.controller';

@Module({
    imports: [AuthModule],
    controllers: [ObstaclesController],
    providers: [
        CreateObstacleUseCase,
        SearchObstaclesUseCase,
        VoteObstacleUseCase,
        RemoveObstacleUseCase,
        ObstacleExpiryJob,
        DomainErrorHttpMapper,
        { provide: OBSTACLE_REPOSITORY, useClass: DrizzleObstacleRepository },
        { provide: CLOCK, useClass: SystemClock },
        { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
        {
            provide: OBSTACLE_POLICY,
            inject: [ConfigService],
            useFactory: (cfg: ConfigService<Env, true>): ObstaclePolicy => ({
                incidentTtlMs: cfg.get('INCIDENT_TTL_SEC', { infer: true }) * 1000,
                dismissThreshold: cfg.get('OBSTACLE_DISMISS_THRESHOLD', { infer: true }),
                maxAreaM2: MAX_OBSTACLE_AREA_M2,
            }),
        },
    ],
})
export class ObstaclesModule {}
