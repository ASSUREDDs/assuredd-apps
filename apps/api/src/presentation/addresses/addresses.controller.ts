import type { AddressListResponse } from '@app/contracts';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { LngLat } from '@domain/shared/geo';
import { SearchAddressesUseCase } from '@application/addresses/search-addresses.usecase';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchAddressesQueryDto } from './dto/address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
    constructor(private readonly searchAddresses: SearchAddressesUseCase) {}

    @Get('search')
    async search(@Query() query: SearchAddressesQueryDto): Promise<AddressListResponse> {
        const near: LngLat | undefined = query.lng !== undefined && query.lat !== undefined ? [query.lng, query.lat] : undefined;
        return { items: await this.searchAddresses.execute(query.q, near) };
    }
}
