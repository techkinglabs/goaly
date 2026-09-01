import { buildQuery, http } from '../lib/http';
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
 * The backend expects these values as query parameters (not a JSON body),
 * so the contract is preserved verbatim here.
 */
export const targetHistoryService = {
  add({ goalId, validFrom, validTo, value, period = 'WEEK' }: TargetHistoryInput): Promise<unknown> {
    const query = buildQuery({ validFrom, value, period, validTo });
    return http.post<unknown>(`/api/goals/${goalId}/target${query}`);
  },

  update(
    historyId: number,
    { goalId, validFrom, validTo, value, period = 'WEEK' }: TargetHistoryInput
  ): Promise<unknown> {
    const query = buildQuery({ validFrom, value, period, validTo });
    return http.put<unknown>(`/api/goals/${goalId}/target/${historyId}${query}`);
  },

  remove(goalId: number, historyId: number): Promise<void> {
    return http.delete<void>(`/api/goals/${goalId}/target/${historyId}`);
  },
};
