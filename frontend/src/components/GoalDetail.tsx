import React, { useCallback, useMemo, useState } from 'react';
import type { ChartRange, DailyEntry, DailyEntryPayload, Goal } from '../types';
import { useTargetHistory } from '../hooks/useTargetHistory';
import { useAsyncAction } from '../hooks/useAsyncAction';
import GoalEntriesTable, { type InlineEntryValues } from './goal-detail/GoalEntriesTable';
import GoalProgressChart from './goal-detail/GoalProgressChart';
import GoalStats from './goal-detail/GoalStats';
import GoalTargetHistory from './goal-detail/GoalTargetHistory';

interface GoalDetailProps {
  goal: Goal;
  entries: DailyEntry[];
  isDarkMode: boolean;
  onCreateEntry: (payload: DailyEntryPayload) => Promise<unknown>;
  onUpdateEntry: (id: number, payload: DailyEntryPayload) => Promise<unknown>;
  onDeleteEntry: (id: number) => void | Promise<unknown>;
  onGoalUpdated?: (goal: Goal) => void;
  isMutatingEntry?: boolean;
  deletingEntryId?: number | null;
}

/**
 * Composition root for the goal detail pane.
 *
 * BUGFIX: the previous version returned early (`if (!goal) return …`) *before*
 * calling ~10 `useMemo` hooks, so the hook order changed between renders — a
 * direct violation of the Rules of Hooks that could corrupt state or crash.
 * `goal` is now a required prop and the parent renders the empty state, so
 * every hook here runs unconditionally.
 */
const GoalDetail: React.FC<GoalDetailProps> = ({
  goal,
  entries,
  isDarkMode,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onGoalUpdated,
  isMutatingEntry = false,
  deletingEntryId = null,
}) => {
  const [range, setRange] = useState<ChartRange>('week');
  const runAction = useAsyncAction();

  const { addTarget, updateTarget, deleteTarget, isAdding, isUpdating, isDeleting } =
    useTargetHistory(goal.id, onGoalUpdated);

  // Entries for this goal, sorted chronologically.
  const goalEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.goalId === goal.id)
        .sort((a, b) => a.entryDate.localeCompare(b.entryDate)),
    [entries, goal.id]
  );

  const handleCreateEntry = useCallback(
    (values: InlineEntryValues) =>
      runAction(
        () =>
          onCreateEntry({
            goalId: goal.id,
            entryDate: values.entryDate,
            actualValue: values.actualValue,
            note: values.note,
          }),
        { errorMessage: 'Failed to create entry', successMessage: 'Entry added' }
      ),
    [runAction, onCreateEntry, goal.id]
  );

  const handleUpdateEntry = useCallback(
    (entry: DailyEntry, values: InlineEntryValues) =>
      runAction(
        () =>
          onUpdateEntry(entry.id, {
            goalId: entry.goalId,
            entryDate: values.entryDate,
            actualValue: values.actualValue,
            targetValue: entry.targetValue,
            note: values.note,
          }),
        { errorMessage: 'Failed to update entry', successMessage: 'Entry updated' }
      ),
    [runAction, onUpdateEntry]
  );

  const handleAddTarget = useCallback(
    (input: Parameters<typeof addTarget>[0]) =>
      runAction(() => addTarget(input), {
        errorMessage: 'Failed to add target change',
        successMessage: 'Target change saved',
      }),
    [runAction, addTarget]
  );

  const handleUpdateTarget = useCallback(
    (historyId: number, input: Parameters<typeof addTarget>[0]) =>
      runAction(() => updateTarget({ historyId, input }), {
        errorMessage: 'Failed to update target change',
        successMessage: 'Target change updated',
      }),
    [runAction, updateTarget]
  );

  const handleDeleteTarget = useCallback(
    (historyId: number) =>
      runAction(() => deleteTarget(historyId), {
        errorMessage: 'Failed to delete target change',
        successMessage: 'Target change deleted',
      }),
    [runAction, deleteTarget]
  );

  return (
    <div>
      <GoalStats goal={goal} entries={goalEntries} />

      <GoalProgressChart
        goal={goal}
        entries={goalEntries}
        range={range}
        onRangeChange={setRange}
        isDarkMode={isDarkMode}
      />

      <GoalTargetHistory
        goal={goal}
        onAdd={handleAddTarget}
        onUpdate={handleUpdateTarget}
        onDelete={handleDeleteTarget}
        isMutating={isAdding || isUpdating || isDeleting}
      />

      <GoalEntriesTable
        goal={goal}
        entries={goalEntries}
        onCreate={handleCreateEntry}
        onUpdate={handleUpdateEntry}
        onDelete={onDeleteEntry}
        isMutating={isMutatingEntry}
        deletingEntryId={deletingEntryId}
      />
    </div>
  );
};

export default React.memo(GoalDetail);
