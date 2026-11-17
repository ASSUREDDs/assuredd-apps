import {
    IDEMPOTENCY_KEY_HEADER,
    TrackBatchResponseSchema,
    VisitSchema,
    type StartVisitRequest,
    type TrackBatchRequest,
    type VisitEventRequest,
} from '@app/contracts';

import { authorizedRequest } from '@/shared/api/authorized-request';

/** Background runs are short; a stuck request must not eat the time the system gives us. */
const TIMEOUT_MS = 10_000;

export function startVisit(input: StartVisitRequest, idempotencyKey: string) {
    return authorizedRequest('/visits', VisitSchema, {
        method: 'POST',
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        body: JSON.stringify(input),
        timeoutMs: TIMEOUT_MS,
    });
}

export function sendVisitEvent(visitId: string, input: VisitEventRequest) {
    return authorizedRequest(`/visits/${visitId}/events`, VisitSchema, {
        method: 'POST',
        body: JSON.stringify(input),
        timeoutMs: TIMEOUT_MS,
    });
}

export function sendTrackPoints(visitId: string, input: TrackBatchRequest, idempotencyKey: string) {
    return authorizedRequest(`/visits/${visitId}/points`, TrackBatchResponseSchema, {
        method: 'POST',
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        body: JSON.stringify(input),
        timeoutMs: TIMEOUT_MS,
    });
}
