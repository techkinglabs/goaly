import { http } from '../lib/http';
import type { DailyEntry, DailyEntryPayload } from '../types';

/** All daily-entry HTTP access. */
export const entriesService = {
  list(signal?: AbortSignal): Promise<DailyEntry[]> {
    return http.get<DailyEntry[]>('/api/entries', signal);
  },

  create(payload: DailyEntryPayload): Promise<DailyEntry> {
    return http.post<DailyEntry>('/api/entries', payload);
  },

  update(id: number, payload: DailyEntryPayload): Promise<DailyEntry> {
    return http.put<DailyEntry>(`/api/entries/${id}`, payload);
  },

  remove(id: number): Promise<void> {
    return http.delete<void>(`/api/entries/${id}`);
  },
};
