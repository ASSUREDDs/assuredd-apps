import { Module } from '@nestjs/common';

import { ENTRANCE_FINDER } from '@domain/routing/entrance-finder';
import { ROUTE_OBSTACLE_SOURCE } from '@domain/routing/route-obstacle-source';
import { ROUTE_PROVIDER } from '@domain/routing/route-provider';
import { BuildRouteUseCase } from '@application/routing/build-route.usecase';
import { CheckRouteUseCase } from '@application/routing/check-route.usecase';
import { CLOCK } from '@application/shared/ports/clock.port';
import { DrizzleEntranceRepository } from '@infrastructure/entrances/drizzle-entrance.repository';
import { DrizzleEntranceFinder } from '@infrastructure/routing/drizzle-entrance-finder';
import { DrizzleRouteObstacleSource } from '@infrastructure/routing/drizzle-route-obstacle.source';
import { ValhallaRouteProvider } from '@infrastructure/routing/valhalla-route.provider';
import { SystemClock } from '@infrastructure/shared/system-clock';

import { AuthModule } from '../auth/auth.module';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { RoutesController } from './routes.controller';

@Module({
    imports: [AuthModule],
    controllers: [RoutesController],
    providers: [
        BuildRouteUseCase,
        CheckRouteUseCase,
        DomainErrorHttpMapper,
        // The router is chosen here: swap ValhallaRouteProvider for our own algorithm later.
        { provide: ROUTE_PROVIDER, useClass: ValhallaRouteProvider },
        DrizzleEntranceRepository,
        { provide: ROUTE_OBSTACLE_SOURCE, useClass: DrizzleRouteObstacleSource },
        { provide: ENTRANCE_FINDER, useClass: DrizzleEntranceFinder },
        { provide: CLOCK, useClass: SystemClock },
    ],
})
export class RoutesModule {}
