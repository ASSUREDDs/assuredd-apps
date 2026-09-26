import { Module } from '@nestjs/common';

import { AppConfigModule } from '@infrastructure/config';
import { DbModule } from '@infrastructure/db';
import { AuthModule } from '@presentation/auth/auth.module';
import { HealthModule } from '@presentation/health/health.module';

@Module({
    imports: [AppConfigModule, DbModule, AuthModule, HealthModule],
})
export class AppModule {}