import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VISIT_REPOSITORY, type VisitRepository } from '@domain/visits/visit.repository';
import { CLOCK, type Clock } from '@application/shared/ports/clock.port';
import type { Env } from '@infrastructure/config';

const INTERVAL_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Raw GPS tracks are personal data of employees, so they are deleted after `TRACK_RETENTION_DAYS`.
 * The visit rows (times and counts) stay; only the points go.
 */
@Injectable()
export class TrackRetentionJob implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TrackRetentionJob.name);
    private timer: NodeJS.Timeout | undefined;

    constructor(
        @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
        @Inject(CLOCK) private readonly clock: Clock,
        private readonly config: ConfigService<Env, true>,
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
            const retentionDays = this.config.get('TRACK_RETENTION_DAYS', { infer: true });
            const deleted = await this.visits.purgePointsBefore(new Date(this.clock.now().getTime() - retentionDays * DAY_MS));
            if (deleted > 0) this.logger.log(`Deleted ${deleted} track point(s) older than ${retentionDays} days`);
        } catch (error) {
            this.logger.error(error instanceof Error ? error.stack : error);
        }
    }
}
