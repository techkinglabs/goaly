import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../lib/queryClient';
import { goalsService } from '../services/goalsService';
import type { Goal, GoalFilter, GoalPayload } from '../types';

/**
 * Single source of truth for goal data.
 *
 * Replaces the old duplicated `loadGoals()` + bootstrap `useEffect` pair in
 * App.tsx: the filter is part of the query key, so switching filters is a
 * cache lookup (or one fetch) instead of hand-rolled imperative reloading.
 */
export function useGoals(filter: GoalFilter) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.goals.list(filter),
    queryFn: ({ signal }) => goalsService.list(filter, signal),
  });

  /** Writes a fresh goal into every cached list + its detail entry. */
  const syncGoal = useCallback(
    (goal: Goal) => {
      queryClient.setQueryData(queryKeys.goals.detail(goal.id), goal);
      queryClient.setQueriesData<Goal[]>(
        { queryKey: queryKeys.goals.all },
        (current) =>
          Array.isArray(current)
            ? current.map((item) => (item.id === goal.id ? goal : item))
            : current
      );
    },
    [queryClient]
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: GoalPayload) => goalsService.create(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GoalPayload }) =>
      goalsService.update(id, payload),
    onSuccess: (goal) => {
      syncGoal(goal);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => goalsService.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.goals.detail(id) });
      invalidate();
      // Entry lists may reference the deleted goal.
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chart.all });
    },
  });

  return {
    goals: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    createGoal: createMutation.mutateAsync,
    updateGoal: updateMutation.mutateAsync,
    deleteGoal: deleteMutation.mutateAsync,

    // Granular flags replace the single global `loading` boolean.
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.isPending ? deleteMutation.variables : null,

    syncGoal,
    invalidateGoals: invalidate,
  };
}

export type UseGoalsResult = ReturnType<typeof useGoals>;
