import type { RouteChangeReason, RoutePlan } from '@app/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/shared/api/http';
import { OBSTACLE_WRITE_KEY } from '@/shared/api/mutation-keys';
import type { LngLat } from '@/shared/lib/geo';

import { buildRoute, checkRoute } from '../api/route.api';

/** The app asks the server whether the route is still valid this often, and when it comes to the foreground. */
const CHECK_INTERVAL_MS = 25_000;
/** A quick background check stays invisible; one that takes longer than this shows "updating". */
const SLOW_CHECK_MS = 400;

export type RouteStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RouteState {
    status: RouteStatus;
    plan: RoutePlan | null;
    error: ApiError | Error | null;
    /** Why the route changed since the courier last saw it. Cleared by `dismissNotice`. */
    notice: RouteChangeReason[] | null;
}

const IDLE: RouteState = { status: 'idle', plan: null, error: null, notice: null };

interface UseRouteParams {
    from: LngLat | null;
    to: LngLat | null;
}

/**
 * Builds a route once per destination, then keeps it fresh by polling `/routes/check`.
 * Polling is simpler and more reliable than a live connection on a bad network.
 */
export function useRoute({ from, to }: UseRouteParams) {
    const queryClient = useQueryClient();
    const [state, setState] = useState<RouteState>(IDLE);
    const [isUpdating, setIsUpdating] = useState(false);
    const fromRef = useRef(from);
    const planRef = useRef<RoutePlan | null>(null);
    const isCheckingRef = useRef(false);
    fromRef.current = from;

    const toKey = to ? `${to[0]},${to[1]}` : null;
    const hasFrom = from !== null;

    useEffect(() => {
        planRef.current = null;
        const origin = fromRef.current;

        if (!to || !origin) {
            setState(IDLE);
            return;
        }

        let isCancelled = false;
        setState({ ...IDLE, status: 'loading' });

        buildRoute({ from: origin, to, useEntrance: true })
            .then((plan) => {
                if (isCancelled) return;
                planRef.current = plan;
                setState({ status: 'ready', plan, error: null, notice: null });
            })
            .catch((error: unknown) => {
                if (isCancelled) return;
                setState({ status: 'error', plan: null, error: error instanceof Error ? error : new Error('Route failed'), notice: null });
            });

        return () => {
            isCancelled = true;
        };
        // `to` is represented by `toKey`: a new array with the same coordinates must not rebuild the route.
    }, [toKey, hasFrom]);

    const checkNow = useCallback(async (options?: { immediate?: boolean }) => {
        const plan = planRef.current;
        const origin = fromRef.current;
        if (!plan || !origin || !to || isCheckingRef.current) return;

        isCheckingRef.current = true;
        const showLoader = setTimeout(() => setIsUpdating(true), options?.immediate ? 0 : SLOW_CHECK_MS);
        try {
            const result = await checkRoute({
                from: origin,
                to,
                useEntrance: true,
                known: { version: plan.version, avoidedObstacleIds: plan.avoided.map((o) => o.id) },
            });
            if (planRef.current !== plan) return;

            if (result.status === 'changed') {
                planRef.current = result.plan;
                setState({ status: 'ready', plan: result.plan, error: null, notice: result.reasons });
            }
        } catch (error) {
            // A lost connection must not wipe a route the courier is following. Real route errors do show.
            if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401) {
                setState((current) => ({ ...current, status: 'error', error }));
            }
        } finally {
            clearTimeout(showLoader);
            setIsUpdating(false);
            isCheckingRef.current = false;
        }
    }, [toKey]);

    useEffect(() => {
        if (state.status !== 'ready') return;

        const interval = setInterval(() => void checkNow(), CHECK_INTERVAL_MS);
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') void checkNow();
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [state.status, checkNow]);

    // The courier just added, confirmed or removed an obstacle: the route may change, so look right away.
    useEffect(
        () =>
            queryClient.getMutationCache().subscribe((event) => {
                if (
                    event.type === 'updated' &&
                    event.action.type === 'success' &&
                    event.mutation.options.mutationKey?.[0] === OBSTACLE_WRITE_KEY[0]
                ) {
                    void checkNow({ immediate: true });
                }
            }),
        [queryClient, checkNow],
    );

    const dismissNotice = useCallback(() => setState((current) => ({ ...current, notice: null })), []);
    const clear = useCallback(() => {
        planRef.current = null;
        setState(IDLE);
    }, []);

    return { ...state, isUpdating, checkNow, dismissNotice, clear };
}
