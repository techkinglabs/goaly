import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Goal, WeeklyEntry } from '../types';

interface WeeklyEntryListProps {
  entries: WeeklyEntry[];
  goals: Goal[];
  onEdit?: (entry: WeeklyEntry) => void;
  onDelete?: (id: number) => void;
}

const WeeklyEntryList: React.FC<WeeklyEntryListProps> = ({
                                                           entries,
                                                           goals,
                                                           onEdit,
                                                           onDelete
                                                         }) => {
  const getGoalName = (goalId: number) => {
    const goal = goals.find((g) => g.id === goalId);
    return goal ? goal.name : 'Unknown Goal';
  };

  return (
    <div className="rounded-lg shadow-md overflow-hidden dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            Goal
          </th>

          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            Week
          </th>

          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            Actual
          </th>

          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            Target
          </th>

          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            Progress
          </th>
          
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            Actions
          </th>
        </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
        {entries.map((entry) => {
          const progress =
              entry.targetValue > 0
                  ? (entry.actualValue / entry.targetValue) * 100
                  : 0;

          return (
              <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap dark:text-white">
                  {getGoalName(entry.goalId)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap dark:text-white">
                  {new Date(entry.weekStartDate).toLocaleDateString()}
                </td>

                <td className="px-6 py-4 dark:text-white">
                  {entry.actualValue}
                </td>

                <td className="px-6 py-4 dark:text-white">
                  {entry.targetValue}
                </td>

                <td className="px-6 py-4 dark:text-white">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2 dark:bg-gray-700">
                      <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                          }}
                      />
                    </div>

                    <span className="dark:text-white">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(entry)}
                      aria-label="Edit entry"
                      title="Edit"
                      className="text-indigo-600 hover:text-indigo-900 mr-3 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      aria-label="Delete entry"
                      title="Delete"
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
          );
        })}
        </tbody>
      </table>

      {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No weekly entries created yet.
          </div>
      )}
    </div>
  );
};

export default WeeklyEntryList;