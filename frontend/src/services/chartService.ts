import { buildQuery, http } from '../lib/http';
import type { ChartDataPoint, ChartRange } from '../types';

/** Aggregated chart data from the backend. */
export const chartService = {
  getData(
    range?: ChartRange,
    anchor?: string,
    signal?: AbortSignal
  ): Promise<ChartDataPoint[]> {
    const query = buildQuery({ range, anchor });
    return http.get<ChartDataPoint[]>(`/api/chart/data${query}`, signal);
  },
};
