import { ApiError, isTransientError } from '@/shared/api/errors';

import type { QueuedAction } from './offline-queue.store';

export interface FlushDeps {
    /** Sends one queued change to the server. */
    send: (action: QueuedAction) => Promise<void>;
    /** The entry was delivered (or no longer matters): take it off the queue. */
    onDone: (action: QueuedAction) => void;
    /** The server refused this change for good: take it off the queue and tell the courier. */
    onRejected: (action: QueuedAction) => void;
    /** It could not be delivered now; keep it and count the attempt. */
    onRetryLater: (action: QueuedAction) => void;
}

export interface FlushResult {
    delivered: number;
    rejected: number;
    /** Entries left for a later attempt. */
    remaining: number;
}

/**
 * Sends queued changes in the order they were made. It stops at the first change that cannot be delivered
 * right now (offline, server busy), because later changes may depend on it. A change the server refuses for
 * good does not block the rest.
 */
export async function flushQueue(actions: QueuedAction[], deps: FlushDeps): Promise<FlushResult> {
    let delivered = 0;
    let rejected = 0;

    for (let index = 0; index < actions.length; index++) {
        const action = actions[index];

        try {
            await deps.send(action);
            deps.onDone(action);
            delivered++;
        } catch (error) {
            // A missing obstacle is not a failure of the change: someone removed it first, there is nothing left to do.
            if (error instanceof ApiError && error.status === 404) {
                deps.onDone(action);
                continue;
            }

            if (isTransientError(error) || (error instanceof ApiError && error.status === 401)) {
                deps.onRetryLater(action);
                return { delivered, rejected, remaining: actions.length - index };
            }

            deps.onRejected(action);
            rejected++;
        }
    }

    return { delivered, rejected, remaining: 0 };
}
