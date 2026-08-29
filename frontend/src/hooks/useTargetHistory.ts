import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../lib/queryClient';
import { goalsService } from '../services/goalsService';
import { targetHistoryService, type TargetHistoryInput } from '../services/targetHistoryService';
import type { Goal } from '../types';

/**
 * Target-history mutations for a single goal. After each write the goal is
 * re-fetched (the backend recomputes derived targets) and pushed into the cache.
 */
export function useTargetHistory(goalId: number | null, onGoalUpdated?: (goal: Goal) => void) {
  const queryClient = useQueryClient();

  const refreshGoal = useCallback(async () => {
    if (goalId == null) return;
    const refreshed = await goalsService.getById(goalId);
    queryClient.setQueryData(queryKeys.goals.detail(goalId), refreshed);
    queryClient.setQueriesData<Goal[]>({ queryKey: queryKeys.goals.all }, (current) =>
      Array.isArray(current)
        ? current.map((item) => (item.id === refreshed.id ? refreshed : item))
        : current
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.chart.all });
    onGoalUpdated?.(refreshed);
  }, [goalId, queryClient, onGoalUpdated]);

  const addMutation = useMutation({
    mutationFn: (input: Omit<TargetHistoryInput, 'goalId'>) => {
      if (goalId == null) throw new Error('No goal selected');
      return targetHistoryService.add({ ...input, goalId });
    },
    onSuccess: refreshGoal,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      historyId,
      input,
    }: {
      historyId: number;
      input: Omit<TargetHistoryInput, 'goalId'>;
    }) => {
      if (goalId == null) throw new Error('No goal selected');
      return targetHistoryService.update(historyId, { ...input, goalId });
    },
    onSuccess: refreshGoal,
  });

  const deleteMutation = useMutation({
    mutationFn: (historyId: number) => {
      if (goalId == null) throw new Error('No goal selected');
      return targetHistoryService.remove(goalId, historyId);
    },
    onSuccess: refreshGoal,
  });

  return {
    addTarget: addMutation.mutateAsync,
    updateTarget: updateMutation.mutateAsync,
    deleteTarget: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
