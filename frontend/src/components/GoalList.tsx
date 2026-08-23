import React from 'react';
import { Goal, DailyEntry } from '../types';

interface GoalListProps {
  goals: Goal[];
  selectedGoalId: number | null;
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: number) => void;
  onSelect?: (goal: Goal) => void;
  entries: DailyEntry[];
}

const calculateProgress = (goal: Goal, entries: WeeklyEntry[]): number => {
  if (!goal.targetValue || goal.targetValue === 0) return 0;
  const goalEntries = entries.filter((entry) => entry.goalId === goal.id);
  const totalActual = goalEntries.reduce((sum, entry) => sum + (entry.actualValue ?? 0), 0);
  return Math.min((totalActual / goal.targetValue) * 100, 100); // Cap at 100%
};

const GoalList: React.FC<GoalListProps> = ({ goals, selectedGoalId, onEdit, onDelete, onSelect, entries }) => {
  const handleClick = (goal: Goal) => {
    if (onSelect) {
      onSelect(goal);
    }
  };

  const handleEdit = (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    if (onEdit) onEdit(goal);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  // Get progress bar class based on percentage
  const getProgressBarClass = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const progress = calculateProgress(goal, entries);
        const isGoalSelected = goal.id === selectedGoalId;
        return (
          <div
            key={goal.id}
            className={`card goal-card !p-3 !mb-0 cursor-pointer transition-all ${isGoalSelected ? 'selected' : 'hover:shadow-md'}`}
            onClick={() => handleClick(goal)}
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-md font-medium text-[var(--text-primary)] truncate">{goal.name}</h3>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={(e) => handleEdit(e, goal)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    title="Edit"
                    aria-label="Edit goal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => handleDelete(e, goal.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                    title="Delete"
                    aria-label="Delete goal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <span className={`badge ${goal.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {goal.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="mt-2">
              <div className="progress-track w-full h-2">
                <div 
                  className={`h-2 rounded-full ${getProgressBarClass(progress)}`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>{progress.toFixed(0)}%</span>
                <span>{goal.targetValue} {goal.unit}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GoalList;