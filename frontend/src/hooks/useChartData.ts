import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../lib/queryClient';
import { chartService } from '../services/chartService';
import type { ChartDataResponse, ChartRange } from '../types';
import { compareISODate } from '../utils/date';

/** One row of the flattened line-chart dataset. */
export interface FlatChartRow {
  label: string;
  [seriesKey: string]: number | string;
}

const getLabel = (entry: ChartDataResponse): string => entry.entryDate ?? entry.weekStart ?? '';

/**
 * Fetches aggregate chart data and memoizes the flattening transform.
 * Sorting uses string comparison on `YYYY-MM-DD` (chronological and
 * timezone-safe) instead of `new Date(str)`, which parsed as UTC.
 */
export function useChartData(range: ChartRange, anchor = '') {
  const query = useQuery({
    queryKey: queryKeys.chart.data(range, anchor),
    queryFn: ({ signal }) => chartService.getData(range, anchor || undefined, signal),
  });

  const data = query.data ?? [];

  const rows = useMemo<FlatChartRow[]>(() => {
    return data
      .slice()
      .sort((a, b) => compareISODate(getLabel(a), getLabel(b)))
      .map((entry) => {
        const row: FlatChartRow = { label: getLabel(entry) };
        // Daily progress per goal: `goal_<id>`
        for (const [key, value] of Object.entries(entry.goals)) row[key] = value;
        // Cumulative progress per goal: `total_<id>`
        for (const [key, value] of Object.entries(entry.totals)) row[key] = value;
        return row;
      });
  }, [data]);

  return {
    rows,
    isEmpty: rows.length === 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export type UseChartDataResult = ReturnType<typeof useChartData>;
