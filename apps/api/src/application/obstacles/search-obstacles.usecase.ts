import { Inject, Injectable } from '@nestjs/common';

import type { ObstacleKind, ObstacleView } from '@domain/obstacles/obstacle.entity';
import { OBSTACLE_REPOSITORY, type ObstacleRepository, type SearchArea } from '@domain/obstacles/obstacle.repository';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

const SEARCH_LIMIT = 200;

export interface SearchObstaclesInput {
    tenantId: string;
    userId: string;
    area: SearchArea;
    kinds?: ObstacleKind[];
}

@Injectable()
export class SearchObstaclesUseCase {
    constructor(
        @Inject(OBSTACLE_REPOSITORY) private readonly obstacles: ObstacleRepository,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    execute(input: SearchObstaclesInput): Promise<ObstacleView[]> {
        return this.obstacles.search({ ...input, now: this.clock.now(), limit: SEARCH_LIMIT });
    }
}
