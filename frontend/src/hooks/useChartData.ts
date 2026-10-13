import { useQuery, type QueryObserverResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../lib/queryClient';
import { chartDataService } from '../services/chartDataService';
import type { ChartDataPoint, ChartRange } from '../types';

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
 */
export function useChartData(
    range: ChartRange,
    goalId?: number,
    anchor?: string,
): UseChartDataResult {
    const queryKey = useMemo(
        () => (goalId !== undefined
            ? queryKeys.chart.data(String(goalId), `${range}-${anchor ?? ''}`)
            : queryKeys.chart.data(range, anchor ?? '')),
        [goalId, range, anchor],
    );

    const query = useQuery<ChartDataPoint[], Error>({
        queryKey,
        queryFn: ({ signal }) =>
            goalId !== undefined
                ? chartDataService.listForGoal(goalId, range, anchor, signal)
                : chartDataService.listAll(range, anchor, signal),
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
