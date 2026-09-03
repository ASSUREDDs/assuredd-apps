import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DB, type Database } from '@infrastructure/db';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly indicator: HealthIndicatorService,
        @Inject(DB) private readonly db: Database,
    ) {}

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            async () => {
                const check = this.indicator.check('database');
                try {
                    await this.db.execute(sql`select 1`);
                    return check.up();
                } catch (e) {
                    return check.down({ message: (e as Error).message });
                }
            },
        ]);
    }
}