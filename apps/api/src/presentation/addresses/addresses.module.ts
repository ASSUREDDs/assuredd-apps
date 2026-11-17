import { Module } from '@nestjs/common';

import { GEOCODER } from '@application/addresses/ports/geocoder.port';
import { SearchAddressesUseCase } from '@application/addresses/search-addresses.usecase';
import { PhotonGeocoder } from '@infrastructure/addresses/photon-geocoder';

import { AuthModule } from '../auth/auth.module';
import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { AddressesController } from './addresses.controller';

@Module({
    imports: [AuthModule],
    controllers: [AddressesController],
    providers: [
        SearchAddressesUseCase,
        DomainErrorHttpMapper,
        { provide: GEOCODER, useClass: PhotonGeocoder },
    ],
})
export class AddressesModule {}
