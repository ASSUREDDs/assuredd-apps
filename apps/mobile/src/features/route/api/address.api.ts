import { AddressListResponseSchema, type AddressSuggestion } from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';
import type { LngLat } from '@/shared/lib/geo';

export async function searchAddresses(query: string, near?: LngLat | null): Promise<AddressSuggestion[]> {
    const params = [`q=${encodeURIComponent(query)}`];
    if (near) params.push(`lng=${near[0]}`, `lat=${near[1]}`);

    const response = await authorizedRequest(`/addresses/search?${params.join('&')}`, AddressListResponseSchema);
    return response.items;
}
