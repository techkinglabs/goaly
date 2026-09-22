import { http } from '../lib/http';
import type { ISODateString } from '../utils/date';
import type { GoalPeriod } from '../types';

export interface TargetHistoryInput {
  goalId: number;
  validFrom: ISODateString;
  validTo?: ISODateString | null;
  value: number;
  period?: GoalPeriod;
}

/**
 * The backend consumes a JSON request body that mirrors
 * {@code org.techkinglabs.dto.TargetHistoryRequest}
 * ({@code validFrom}, {@code validTo}, {@code value}, {@code period}),
 * so the payload is sent verbatim as the request body.
 */
export const targetHistoryService = {
  add({ goalId, validFrom, validTo, value, period = 'WEEK' }: TargetHistoryInput): Promise<unknown> {
    return http.post<unknown>(`/api/goals/${goalId}/target`, { validFrom, validTo, value, period });
  },

  update(
    historyId: number,
    { goalId, validFrom, validTo, value, period = 'WEEK' }: TargetHistoryInput
  ): Promise<unknown> {
    return http.put<unknown>(`/api/goals/${goalId}/target/${historyId}`, { validFrom, validTo, value, period });
  },

  remove(goalId: number, historyId: number): Promise<void> {
    return http.delete<void>(`/api/goals/${goalId}/target/${historyId}`);
  },
};
