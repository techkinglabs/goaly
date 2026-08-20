import React from 'react';
import { Goal } from '../types';

interface GoalListProps {
  goals: Goal[];
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: number) => void;
}

const GoalList: React.FC<GoalListProps> = ({ goals, onEdit, onDelete }) => {
  const handleDelete = (id: number) => {
    return () => {
      if (onDelete) onDelete(id);
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map((goal) => (
        <div key={goal.id} className="rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow dark:bg-gray-800">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${goal.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
              {goal.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Unit: {goal.unit}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Target: {goal.targetValue} {goal.unit}</p>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Days: {goal.daysOfWeek ? goal.daysOfWeek.join(', ') : 'None'}
          </p>
          {goal.description && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">Description: {goal.description}</p>
          )}
          <div className="mt-4 flex justify-between items-center">
            <div className="space-x-2">
              <button 
                onClick={() => onEdit && onEdit(goal)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
              >
                Edit
              </button>
              <button 
                onClick={handleDelete(goal.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GoalList;