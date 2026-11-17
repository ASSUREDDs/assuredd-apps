import { Inject, Injectable } from '@nestjs/common';

import type { LngLat } from '@domain/shared/geo';

import { type AddressSuggestion, GEOCODER, type Geocoder } from './ports/geocoder.port';

@Injectable()
export class SearchAddressesUseCase {
    constructor(@Inject(GEOCODER) private readonly geocoder: Geocoder) {}

    execute(query: string, near?: LngLat): Promise<AddressSuggestion[]> {
        return this.geocoder.search(query, near);
    }
}
