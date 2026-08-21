import React, { useState, useMemo } from 'react';
import type { Goal, WeeklyEntry } from '../types';
import CreateWeeklyEntryForm from './CreateWeeklyEntryForm';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface GoalDetailProps {
  goal: Goal | null;
  goals: Goal[];
  onSubmit: (entryData: {
    goalId: number;
    weekStartDate: string;
    actualValue: number;
  }) => void;
  onEditEntry?: (entry: WeeklyEntry) => void;
  onDeleteEntry?: (id: number) => void;
  entries: WeeklyEntry[]; // Added entries prop
}

const GoalDetail: React.FC<GoalDetailProps> = ({ goal, goals, onSubmit, onEditEntry, onDeleteEntry, entries }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  if (!goal) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Select a goal to view details</p>
      </div>
    );
  }

  // Filter entries for this specific goal
  const goalEntries = useMemo(() => {
    return entries.filter(entry => entry.goalId === goal.id).sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime());
  }, [entries, goal]);

  // Prepare data for chart
  const chartData = useMemo(() => {
    if (!goalEntries.length) return [];

    // Work with each entry individually (sorted by date).
    //  - "Progress"      : the % of this single entry vs target -> 1/7, 1/7, ...
    //  - "Total Progress" : cumulative sum of entries so far, as % of target
    //                      -> 1/7, 2/7, 3/7, ... up to 7/7 = 100%
    //  Both lines share the SAME percentage scale (target value = 100%),
    //  so no mixed raw-value / percentage axes.
    const sorted = [...goalEntries].sort(
      (a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()
    );

    const target = goal.targetValue > 0 ? goal.targetValue : 1;
    let runningTotal = 0;

    return sorted.map((entry) => {
      // Progress line: this single entry as % of target
      const progress = (entry.actualValue / target) * 100;

      // Total Progress line: cumulative sum so far as % of target (no cap)
      runningTotal += entry.actualValue;
      const totalProgress = (runningTotal / target) * 100;

      return {
        weekStart: entry.weekStartDate,
        progress: Math.round(progress * 10) / 10,
        progressRaw: entry.actualValue,
        totalProgress: Math.round(totalProgress * 10) / 10,
        totalRaw: runningTotal,
      };
    });
  }, [goalEntries, goal]);

  // Calculate current progress percentage
  const totalActual = useMemo(() => {
    return goalEntries.reduce((sum, entry) => sum + entry.actualValue, 0);
  }, [goalEntries]);

  const progressPercentage = (totalActual / goal.targetValue) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{goal.name}</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{goal.description || 'No description'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
          <p className={`text-xl font-semibold ${goal.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {goal.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{progressPercentage.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Target Value</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{goal.targetValue} {goal.unit}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Progress Trend</h3>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
                <XAxis 
                  dataKey="weekStart" 
                  className="dark:fill-gray-300"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="percent"
                  className="dark:fill-gray-300"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  yAxisId="raw"
                  orientation="right"
                  className="dark:fill-gray-300"
                  domain={[0, goal.targetValue]}
                  ticks={[0, goal.targetValue / 4, goal.targetValue / 2, (goal.targetValue * 3) / 4, goal.targetValue]}
                  tickFormatter={(value) => `${value} ${goal.unit}`}
                />

                <Line 
                  yAxisId="raw"
                  type="monotone"
                  dataKey="totalRaw" 
                  stroke="transparent"
                  strokeWidth={0}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  name=" "
                  isAnimationActive={false}
                />
                <ReferenceLine 
                  yAxisId="percent"
                  y={100} 
                  stroke="#9ca3af" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Target (100%)', position: 'insideTopRight', fill: '#9ca3af', fontSize: 11 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} 
                  itemStyle={{ color: '#f9fafb' }}
                  formatter={(value, name, item) => {
                    if (name === ' ') return [null as unknown as string, null as unknown as string];
                    const payload = item?.payload ?? {};
                    const raw = name === 'Total Progress' ? payload.totalRaw : payload.progressRaw;
                    return [`${value}% (${raw} ${goal.unit})`, name];
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="percent"
                  type="monotone"
                  dataKey="progress" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Progress"
                />
                <Line 
                  yAxisId="percent"
                  type="monotone"
                  dataKey="totalProgress" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name="Total Progress"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No progress data available</p>
        )}
      </div>

      {/* Recent Entries Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Entries</h3>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition duration-200"
            title="Add Entry"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {goalEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actual Value</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {goalEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.weekStartDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.actualValue} {goal.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {onEditEntry && (
                          <button
                            onClick={() => onEditEntry(entry)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                        )}
                        {onDeleteEntry && (
                          <button
                            onClick={() => onDeleteEntry(entry.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No entries yet for this goal</p>
        )}
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Entry</h3>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CreateWeeklyEntryForm 
                goals={[goal]} 
                onSubmit={(entryData) => {
                  onSubmit(entryData);
                  setShowCreateForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalDetail;