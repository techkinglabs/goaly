import React, { useCallback } from 'react';
import type { Goal } from '../types';
import EmptyState from './ui/EmptyState';
import { PencilIcon, TrashIcon } from './ui/icons';

interface GoalListProps {
  goals: Goal[];
  selectedGoalId: number | null;
  /** `goalId -> summed actualValue`, precomputed once by `useEntries`. */
  totalsByGoalId: Map<number, number>;
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: number) => void;
  onSelect?: (goal: Goal) => void;
  deletingGoalId?: number | null;
}

function progressBarClass(percentage: number): string {
  if (percentage >= 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

interface GoalListItemProps {
  goal: Goal;
  progress: number;
  isSelected: boolean;
  isDeleting: boolean;
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: number) => void;
  onSelect?: (goal: Goal) => void;
}

/**
 * Memoized row: re-renders only when this goal's own data, progress or
 * selection changes — not when a sibling row updates.
 */
const GoalListItem = React.memo<GoalListItemProps>(
  ({ goal, progress, isSelected, isDeleting, onEdit, onDelete, onSelect }) => {
    const handleSelect = useCallback(() => onSelect?.(goal), [onSelect, goal]);

    const handleEdit = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        onEdit?.(goal);
      },
      [onEdit, goal]
    );

    const handleDelete = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        onDelete?.(goal.id);
      },
      [onDelete, goal.id]
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(goal);
        }
      },
      [onSelect, goal]
    );

    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={`card goal-card mb-0 cursor-pointer p-3 transition-all ${
          isSelected ? 'selected' : 'hover:shadow-md'
        } ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-md truncate font-medium text-[var(--text-primary)]">{goal.name}</h3>
          <div className="flex items-center gap-1">
            {onEdit ? (
              <button
                type="button"
                onClick={handleEdit}
                className="btn-icon text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                title="Edit"
                aria-label={`Edit goal ${goal.name}`}
              >
                <PencilIcon />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-icon text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                title="Delete"
                aria-label={`Delete goal ${goal.name}`}
              >
                <TrashIcon />
              </button>
            ) : null}
            <span className={`badge ${goal.isActive ? 'badge-success' : 'badge-danger'}`}>
              {goal.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <div
            className="progress-track h-2 w-full"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${goal.name} progress`}
          >
            <div
              className={`h-2 rounded-full ${progressBarClass(progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>{progress.toFixed(0)}%</span>
            <span>
              {goal.targetValue} {goal.unit}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

GoalListItem.displayName = 'GoalListItem';

const GoalList: React.FC<GoalListProps> = ({
  goals,
  selectedGoalId,
  totalsByGoalId,
  onEdit,
  onDelete,
  onSelect,
  deletingGoalId = null,
}) => {
  if (goals.length === 0) {
    return (
      <EmptyState
        title="No goals yet"
        description="Create your first goal to start tracking progress."
      />
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        // Progress is a cheap lookup + divide; no per-row filter/reduce.
        const total = totalsByGoalId.get(goal.id) ?? 0;
        const progress =
          goal.targetValue > 0 ? Math.min((total / goal.targetValue) * 100, 100) : 0;

        return (
          <GoalListItem
            key={goal.id}
            goal={goal}
            progress={progress}
            isSelected={goal.id === selectedGoalId}
            isDeleting={deletingGoalId === goal.id}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
};

export default React.memo(GoalList);
