import { useQuery } from '@tanstack/react-query';

import {
    findUkrainianCity,
    suggestUkrainianStreets,
    type AddressSuggestion,
} from '@/shared/lib/address-suggest';
import type { Coordinates } from '@/shared/lib/geocode';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;
const SUGGESTION_STALE_MS = 5 * 60 * 1000;

export function useCityCenter(city: string) {
    const debouncedCity = useDebouncedValue(city.trim(), DEBOUNCE_MS);

    return useQuery<Coordinates | null>({
        queryKey: ['city-center', debouncedCity],
        queryFn: ({ signal }) => findUkrainianCity(debouncedCity, signal),
        enabled: debouncedCity.length >= MIN_QUERY_LENGTH,
        staleTime: Infinity,
    });
}

export function useAddressSuggestions(query: string, proximity?: Coordinates) {
    const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

    return useQuery<AddressSuggestion[]>({
        queryKey: ['address-suggestions', debouncedQuery, proximity?.longitude, proximity?.latitude],
        queryFn: ({ signal }) => suggestUkrainianStreets(debouncedQuery, proximity, signal),
        enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
        staleTime: SUGGESTION_STALE_MS,
    });
}
