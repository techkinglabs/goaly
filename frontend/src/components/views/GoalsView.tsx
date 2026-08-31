import React, { useCallback, useState } from 'react';
import type { DailyEntry, DailyEntryPayload, Goal, GoalFilter, GoalPayload } from '../../types';
import { GOAL_FILTERS, GOAL_FILTER_LABELS } from '../../types';
import GoalDetail from '../GoalDetail';
import GoalForm from '../GoalForm';
import GoalList from '../GoalList';
import EmptyState from '../ui/EmptyState';
import ErrorBoundary from '../ui/ErrorBoundary';
import Modal from '../ui/Modal';
import { PlusIcon } from '../ui/icons';

interface GoalsViewProps {
  goals: Goal[];
  entries: DailyEntry[];
  totalsByGoalId: Map<number, number>;
  weekTotalsByGoalId: Map<number, number>;
  selectedGoal: Goal | null;
  selectedGoalId: number | null;
  goalFilter: GoalFilter;
  isDarkMode: boolean;
  onFilterChange: (filter: GoalFilter) => void;
  onSelectGoal: (goal: Goal) => void;
  onCreateGoal: (payload: GoalPayload) => Promise<unknown>;
  onUpdateGoal: (id: number, payload: GoalPayload) => Promise<unknown>;
  onDeleteGoal: (id: number) => void;
  onCreateEntry: (payload: DailyEntryPayload) => Promise<unknown>;
  onUpdateEntry: (id: number, payload: DailyEntryPayload) => Promise<unknown>;
  onDeleteEntry: (id: number) => void;
  onGoalUpdated: (goal: Goal) => void;
  isCreatingGoal: boolean;
  isUpdatingGoal: boolean;
  deletingGoalId: number | null;
  isMutatingEntry: boolean;
  deletingEntryId: number | null;
}

const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  entries,
  totalsByGoalId,
  weekTotalsByGoalId,
  selectedGoal,
  selectedGoalId,
  goalFilter,
  isDarkMode,
  onFilterChange,
  onSelectGoal,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onGoalUpdated,
  isCreatingGoal,
  isUpdatingGoal,
  deletingGoalId,
  isMutatingEntry,
  deletingEntryId,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleCreate = useCallback(
    async (payload: GoalPayload) => {
      const created = await onCreateGoal(payload);
      if (created) setIsCreateOpen(false);
    },
    [onCreateGoal]
  );

  const handleUpdate = useCallback(
    async (payload: GoalPayload) => {
      if (!editingGoal) return;
      const updated = await onUpdateGoal(editingGoal.id, payload);
      if (updated) setEditingGoal(null);
    },
    [editingGoal, onUpdateGoal]
  );

  return (
    <div className="flex h-[calc(100vh-200px)] flex-row space-x-4">
      <div className="pane w-1/3 overflow-y-auto p-4">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex gap-2" role="group" aria-label="Filter goals">
            {GOAL_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onFilterChange(filter)}
                aria-pressed={goalFilter === filter}
                className={goalFilter === filter ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                {GOAL_FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary ml-auto flex items-center justify-center"
            aria-label="Create goal"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>

        <GoalList
          goals={goals}
          selectedGoalId={selectedGoalId}
          totalsByGoalId={totalsByGoalId}
          weekTotalsByGoalId={weekTotalsByGoalId}
          onEdit={setEditingGoal}
          onDelete={onDeleteGoal}
          onSelect={onSelectGoal}
          deletingGoalId={deletingGoalId}
        />
      </div>

      <div className="pane-detail w-2/3 overflow-y-auto p-4">
        {selectedGoal ? (
          <ErrorBoundary boundaryName="goal-detail">
            <GoalDetail
              // Remount when the selection changes so local UI state resets.
              key={selectedGoal.id}
              goal={selectedGoal}
              entries={entries}
              isDarkMode={isDarkMode}
              onCreateEntry={onCreateEntry}
              onUpdateEntry={onUpdateEntry}
              onDeleteEntry={onDeleteEntry}
              onGoalUpdated={onGoalUpdated}
              isMutatingEntry={isMutatingEntry}
              deletingEntryId={deletingEntryId}
            />
          </ErrorBoundary>
        ) : (
          <EmptyState
            title={goals.length === 0 ? 'No goals to show' : 'Select a goal to view details'}
            description={
              goals.length === 0
                ? 'Create a goal to start tracking your progress.'
                : undefined
            }
            className="h-full"
            action={
              goals.length === 0 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsCreateOpen(true)}
                >
                  Create Goal
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      <Modal
        open={isCreateOpen}
        title="Create New Goal"
        onClose={() => setIsCreateOpen(false)}
      >
        <GoalForm mode="create" onSubmit={handleCreate} isSubmitting={isCreatingGoal} />
      </Modal>

      <Modal
        open={editingGoal !== null}
        title="Edit Goal"
        onClose={() => setEditingGoal(null)}
      >
        {editingGoal ? (
          <GoalForm
            key={editingGoal.id}
            mode="edit"
            goal={editingGoal}
            onSubmit={handleUpdate}
            onCancel={() => setEditingGoal(null)}
            isSubmitting={isUpdatingGoal}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default GoalsView;
