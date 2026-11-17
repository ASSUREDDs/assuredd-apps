import { Module } from '@nestjs/common';

import { AppConfigModule } from '@infrastructure/config';
import { DbModule } from '@infrastructure/db';
import { AddressesModule } from '@presentation/addresses/addresses.module';
import { AuthModule } from '@presentation/auth/auth.module';
import { EntrancesModule } from '@presentation/entrances/entrances.module';
import { HealthModule } from '@presentation/health/health.module';
import { ObstaclesModule } from '@presentation/obstacles/obstacles.module';
import { RoutesModule } from '@presentation/routes/routes.module';
import { IdempotencyModule } from '@presentation/shared/idempotency.module';
import { VisitsModule } from '@presentation/visits/visits.module';

@Module({
    imports: [AppConfigModule, DbModule, IdempotencyModule, AuthModule, HealthModule, ObstaclesModule, EntrancesModule, RoutesModule, AddressesModule, VisitsModule],
})
export class AppModule {}