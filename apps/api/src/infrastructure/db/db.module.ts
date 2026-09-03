import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Env } from '../config';
import { DB, PG_POOL } from './db.tokens';

export type Database = NodePgDatabase<Record<string, never>>;

@Global()
@Module({
    providers: [
        {
            provide: PG_POOL,
            inject: [ConfigService],
            useFactory: (cfg: ConfigService<Env, true>) =>
                new Pool({
                    connectionString: cfg.get('DATABASE_URL', { infer: true }),
                    max: 10,
                }),
        },
        {
            provide: DB,
            inject: [PG_POOL],
            useFactory: (pool: Pool): Database => drizzle(pool),
        },
    ],
    exports: [DB, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
    constructor(private readonly moduleRef: ModuleRef) {}

    async onApplicationShutdown(): Promise<void> {
        await this.moduleRef.get<Pool>(PG_POOL).end();
    }
}