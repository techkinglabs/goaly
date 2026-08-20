import React from 'react';
import type { Goal, WeeklyEntry } from '../types';

interface WeeklyEntryListProps {
  entries: WeeklyEntry[];
  goals: Goal[];
}

const WeeklyEntryList: React.FC<WeeklyEntryListProps> = ({
                                                           entries,
                                                           goals,
                                                         }) => {
  const getGoalName = (goalId: number) => {
    const goal = goals.find((g) => g.id === goalId);
    return goal ? goal.name : 'Unknown Goal';
  };

  return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Goal
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Week
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Actual
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Target
            </th>

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Progress
            </th>
          </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => {
            const progress =
                entry.targetValue > 0
                    ? (entry.actualValue / entry.targetValue) * 100
                    : 0;

            return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getGoalName(entry.goalId)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(entry.weekStartDate).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    {entry.actualValue}
                  </td>

                  <td className="px-6 py-4">
                    {entry.targetValue}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                            }}
                        />
                      </div>

                      <span>
                      {progress.toFixed(0)}%
                    </span>
                    </div>
                  </td>
                </tr>
            );
          })}
          </tbody>
        </table>

        {entries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No weekly entries created yet.
            </div>
        )}
      </div>
  );
};

export default WeeklyEntryList;