import { useQuery, type QueryObserverResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../lib/queryClient';
import { chartDataService } from '../services/chartDataService';
import type { ChartDataPoint, ChartRange } from '../types';
import { todayISO } from '../utils/date';

export interface UseChartDataResult {
    data: ChartDataPoint[];
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => Promise<QueryObserverResult<ChartDataPoint[], Error>>;
}

/**
 * Fetches chart data from the backend for the given range and optional goal.
 * The backend computes all progress math (daily %, cumulative %, ideal paths,
 * cumulative raw, daily raw), so the frontend only needs to render it.
 *
 * `anchor` defaults to the user's local `todayISO()` so the chart range is
 * computed in the user's timezone. Without it, the backend uses server time
 * which can lag behind (or jump ahead of) the user's local date, making
 * "This Week" on a Monday show last week when the server is still on Sunday.
 */
export function useChartData(
    range: ChartRange,
    goalId?: number,
    anchor?: string,
): UseChartDataResult {
    const effectiveAnchor = anchor ?? todayISO();

    const queryKey = useMemo(
        () => (goalId !== undefined
            ? queryKeys.chart.data(String(goalId), `${range}-${effectiveAnchor}`)
            : queryKeys.chart.data(range, effectiveAnchor)),
        [goalId, range, effectiveAnchor],
    );

    const query = useQuery<ChartDataPoint[], Error>({
        queryKey,
        queryFn: ({ signal }) =>
            goalId !== undefined
                ? chartDataService.listForGoal(goalId, range, effectiveAnchor, signal)
                : chartDataService.listAll(range, effectiveAnchor, signal),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false,
    });

    return {
        data: query.data ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error ?? null,
        refetch: query.refetch,
    };
}
