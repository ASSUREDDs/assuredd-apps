import { Module } from '@nestjs/common';

import { ENTRANCE_REPOSITORY } from '@domain/entrances/entrance.repository';
import { CreateEntranceUseCase } from '@application/entrances/create-entrance.usecase';
import { RemoveEntranceUseCase } from '@application/entrances/remove-entrance.usecase';
import { SearchEntrancesUseCase } from '@application/entrances/search-entrances.usecase';
import { CLOCK } from '@application/shared/ports/clock.port';
import { ID_GENERATOR } from '@application/shared/ports/id-generator.port';
import { DrizzleEntranceRepository } from '@infrastructure/entrances/drizzle-entrance.repository';
import { CryptoIdGenerator } from '@infrastructure/shared/crypto-id-generator';
import { SystemClock } from '@infrastructure/shared/system-clock';

import { AuthModule } from '../auth/auth.module';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { EntrancesController } from './entrances.controller';

@Module({
    imports: [AuthModule],
    controllers: [EntrancesController],
    providers: [
        CreateEntranceUseCase,
        SearchEntrancesUseCase,
        RemoveEntranceUseCase,
        DomainErrorHttpMapper,
        { provide: ENTRANCE_REPOSITORY, useClass: DrizzleEntranceRepository },
        { provide: CLOCK, useClass: SystemClock },
        { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
    ],
})
export class EntrancesModule {}
