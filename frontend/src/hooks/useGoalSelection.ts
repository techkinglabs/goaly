import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Goal } from '../types';

/**
 * Owns "which goal is selected" for the split-pane view.
 *
 * The selection is reconciled in an effect (never during render): if the
 * selected goal disappears from the list — filtered out or deleted — it falls
 * back to the first available goal, matching the previous behaviour.
 */
export function useGoalSelection(goals: Goal[]) {
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedGoalId((previous) => {
      if (previous != null && goals.some((goal) => goal.id === previous)) return previous;
      return goals.length > 0 ? goals[0].id : null;
    });
  }, [goals]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId]
  );

  const selectGoal = useCallback((goal: Goal) => {
    setSelectedGoalId(goal.id);
  }, []);

  return { selectedGoalId, selectedGoal, selectGoal };
}
