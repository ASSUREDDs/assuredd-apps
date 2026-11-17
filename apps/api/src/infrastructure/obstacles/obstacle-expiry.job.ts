import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { OBSTACLE_REPOSITORY, type ObstacleRepository } from '@domain/obstacles/obstacle.repository';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';

const INTERVAL_MS = 5 * 60 * 1000;

/**
 * Queries already hide expired obstacles, so this only keeps the stored status honest.
 * A plain timer instead of a scheduler package: one job, no extra dependency.
 */
@Injectable()
export class ObstacleExpiryJob implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ObstacleExpiryJob.name);
    private timer: NodeJS.Timeout | undefined;

    constructor(
        @Inject(OBSTACLE_REPOSITORY) private readonly obstacles: ObstacleRepository,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    onModuleInit(): void {
        this.timer = setInterval(() => void this.run(), INTERVAL_MS);
        this.timer.unref();
        void this.run();
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer);
    }

    private async run(): Promise<void> {
        try {
            const expired = await this.obstacles.expireDue(this.clock.now());
            if (expired > 0) this.logger.log(`Expired ${expired} obstacle(s)`);
        } catch (error) {
            this.logger.error(error instanceof Error ? error.stack : error);
        }
    }
}
