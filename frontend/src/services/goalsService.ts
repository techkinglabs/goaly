import { buildQuery, http } from '../lib/http';
import type { Goal, GoalFilter, GoalPayload } from '../types';

/** All goal HTTP access lives here — components never touch `http` directly. */
export const goalsService = {
  list(filter: GoalFilter, signal?: AbortSignal): Promise<Goal[]> {
    const query = buildQuery({
      active: filter === 'all' ? undefined : filter === 'active',
    });
    return http.get<Goal[]>(`/api/goals${query}`, signal);
  },

  getById(id: number, signal?: AbortSignal): Promise<Goal> {
    return http.get<Goal>(`/api/goals/${id}`, signal);
  },

  create(payload: GoalPayload): Promise<Goal> {
    return http.post<Goal>('/api/goals', payload);
  },

  update(id: number, payload: GoalPayload): Promise<Goal> {
    return http.put<Goal>(`/api/goals/${id}`, payload);
  },

  remove(id: number): Promise<void> {
    return http.delete<void>(`/api/goals/${id}`);
  },
};
