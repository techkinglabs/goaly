import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '../lib/queryClient';
import { entriesService } from '../services/entriesService';
import type { DailyEntry, DailyEntryPayload } from '../types';

/** Single source of truth for daily-entry data. */
export function useEntries() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.entries.list(),
    queryFn: ({ signal }) => entriesService.list(signal),
  });

  const entries = query.data ?? [];

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all });
    // Entry changes shift aggregate chart data too.
    void queryClient.invalidateQueries({ queryKey: queryKeys.chart.all });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: DailyEntryPayload) => entriesService.create(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DailyEntryPayload }) =>
      entriesService.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => entriesService.remove(id),
    onSuccess: invalidate,
  });

  /**
   * `goalId -> total actual value`, computed once per entries change.
   * Previously every GoalList row ran its own `filter().reduce()` on every
   * render, i.e. O(goals × entries) per render; this is O(entries) once.
   */
  const totalsByGoalId = useMemo(() => {
    const totals = new Map<number, number>();
    for (const entry of entries) {
      totals.set(entry.goalId, (totals.get(entry.goalId) ?? 0) + (entry.actualValue ?? 0));
    }
    return totals;
  }, [entries]);

  /** `goalId -> entries`, so detail views avoid repeated full scans. */
  const entriesByGoalId = useMemo(() => {
    const grouped = new Map<number, DailyEntry[]>();
    for (const entry of entries) {
      const bucket = grouped.get(entry.goalId);
      if (bucket) bucket.push(entry);
      else grouped.set(entry.goalId, [entry]);
    }
    return grouped;
  }, [entries]);

  return {
    entries,
    totalsByGoalId,
    entriesByGoalId,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    createEntry: createMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.isPending ? deleteMutation.variables : null,
  };
}

export type UseEntriesResult = ReturnType<typeof useEntries>;
