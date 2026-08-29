import { buildQuery, http } from '../lib/http';
import type { ChartDataResponse, ChartRange } from '../types';

/** Aggregated chart data from the backend. */
export const chartService = {
  getData(
    range?: ChartRange,
    anchor?: string,
    signal?: AbortSignal
  ): Promise<ChartDataResponse[]> {
    const query = buildQuery({ range, anchor });
    return http.get<ChartDataResponse[]>(`/api/chart/data${query}`, signal);
  },
};
