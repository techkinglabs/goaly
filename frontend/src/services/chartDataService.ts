import { buildQuery, http } from '../lib/http';
import type { ChartDataPoint, ChartRange } from '../types';
import type { ISODateString } from '../utils/date';

/** All chart-data HTTP access lives here — components never touch `http` directly. */
export const chartDataService = {
  /** Fetch chart data for all goals. */
  listAll(range: ChartRange, anchor?: ISODateString, signal?: AbortSignal): Promise<ChartDataPoint[]> {
    const query = buildQuery({ range, anchor });
    return http.get<ChartDataPoint[]>(`/api/chart/data${query}`, signal);
  },

  /** Fetch chart data for a single goal. */
  listForGoal(goalId: number, range: ChartRange, anchor?: ISODateString, signal?: AbortSignal): Promise<ChartDataPoint[]> {
    const params: Record<string, string | number | undefined> = { range };
    if (anchor) params.anchor = anchor;
    const query = buildQuery(params);
    return http.get<ChartDataPoint[]>(`/api/chart/data/${goalId}${query}`, signal);
  },
};
