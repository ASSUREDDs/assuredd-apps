import { z } from 'zod';

import { LngLatSchema } from './geo';

export const SearchAddressesQuerySchema = z.object({
    q: z.string().trim().min(2).max(120),
    /** Bias the results toward the courier's position. */
    lng: z.coerce.number().min(-180).max(180).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
});
export type SearchAddressesQuery = z.infer<typeof SearchAddressesQuerySchema>;

export const AddressSuggestionSchema = z.object({
    id: z.string(),
    /** Ready to show: "вулиця Хрещатик 22, Київ". */
    label: z.string(),
    street: z.string().nullable(),
    houseNumber: z.string().nullable(),
    city: z.string().nullable(),
    point: LngLatSchema,
});
export type AddressSuggestion = z.infer<typeof AddressSuggestionSchema>;

export const AddressListResponseSchema = z.object({ items: z.array(AddressSuggestionSchema) });
export type AddressListResponse = z.infer<typeof AddressListResponseSchema>;
