import { Module } from '@nestjs/common';
import { AppConfigModule } from '@infrastructure/config';
import { DbModule } from '@infrastructure/db';
import { HealthModule } from '@presentation/health/health.module';

@Module({
    imports: [AppConfigModule, DbModule, HealthModule],
})
export class AppModule {}