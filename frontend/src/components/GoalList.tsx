import React from 'react';
import { Goal } from '../types';

interface GoalListProps {
  goals: Goal[];
}

const GoalList: React.FC<GoalListProps> = ({ goals }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map(goal => (
        <div key={goal.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${goal.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {goal.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-2 text-gray-600">{goal.id}</p>
          <div className="mt-4 flex justify-between items-center">
            {/*<span className="text-sm text-gray-500">Created: {new Date(goal.targetValue).toLocaleDateString()}</span>*/}
            <div className="space-x-2">
              <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors">
                Edit
              </button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors">
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