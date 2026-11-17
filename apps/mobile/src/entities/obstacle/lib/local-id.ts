export const LOCAL_ID_PREFIX = 'local:';

export const isLocalId = (id: string): boolean => id.startsWith(LOCAL_ID_PREFIX);

/** The id an obstacle waiting in the queue goes by on the map, derived from its idempotency key. */
export const newLocalId = (idempotencyKey: string): string => `${LOCAL_ID_PREFIX}${idempotencyKey}`;
