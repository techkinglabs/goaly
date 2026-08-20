import React from 'react';
import { Goal } from '../types';

interface GoalListProps {
  goals: Goal[];
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: number) => void;
  onSelect?: (goal: Goal) => void;
  entries: any[]; // Added entries prop for progress calculation
}

const GoalList: React.FC<GoalListProps> = ({ goals, onEdit, onDelete, onSelect, entries }) => {
  const handleDelete = (id: number) => {
    return () => {
      if (onDelete) onDelete(id);
    };
  };

  const handleClick = (goal: Goal) => {
    if (onSelect) {
      onSelect(goal);
    }
  };

  // Calculate progress percentage for a goal
  const calculateProgress = (goal: Goal) => {
    if (!entries || entries.length === 0) return 0;
    
    const goalEntries = entries.filter(entry => entry.goalId === goal.id);
    const totalActual = goalEntries.reduce((sum, entry) => sum + entry.actualValue, 0);
    return Math.min((totalActual / goal.targetValue) * 100, 100); // Cap at 100%
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
    <div className="space-y-2">
      {goals.map((goal) => {
        const progress = calculateProgress(goal);
        const isGoalSelected = onSelect && goal.id === (goals.find(g => g.id === goal.id)?.id); // This will need to be improved
        return (
          <div 
            key={goal.id} 
            className={`p-3 rounded-lg cursor-pointer transition-colors ${isGoalSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} border dark:border-gray-600`}
            onClick={() => handleClick(goal)}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-md font-medium text-gray-900 dark:text-white truncate">{goal.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${goal.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                {goal.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className={`h-2 rounded-full ${getProgressBarClass(progress)}`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
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