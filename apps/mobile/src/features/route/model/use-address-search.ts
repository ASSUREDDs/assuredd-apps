import type { AddressSuggestion } from '@app/contracts';
import { useQuery } from '@tanstack/react-query';

import type { LngLat } from '@/shared/lib/geo';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

import { searchAddresses } from '../api/address.api';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;
const STALE_MS = 5 * 60 * 1000;

export function useAddressSearch(query: string, near: LngLat | null) {
    const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);

    return useQuery<AddressSuggestion[]>({
        queryKey: ['address-search', debounced, near?.[0], near?.[1]],
        queryFn: () => searchAddresses(debounced, near),
        enabled: debounced.length >= MIN_QUERY_LENGTH,
        staleTime: STALE_MS,
    });
}
