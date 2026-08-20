import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import type { ChartDataResponse } from '../types';

interface ChartViewProps {
  data: ChartDataResponse[];
}

const ChartView: React.FC<ChartViewProps> = ({ data }) => {
  // Transform data for line chart - flatten the goals object into individual fields
  const lineChartData = data
    .slice()
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
    .map(entry => {
      const flat: Record<string, number | string> = { weekStart: entry.weekStart };
      // daily progress per goal (top-level key goal_<id>)
      for (const [k, v] of Object.entries(entry.goals)) flat[k] = v;
      // cumulative total progress per goal (top-level key total_<id>)
      for (const [k, v] of Object.entries(entry.totals)) flat[k] = v;
      return flat;
    });

  // Get all unique goal keys to create dynamic lines
  const allGoalKeys = Array.from(
    new Set(data.flatMap(item => Object.keys(item.goals)))
  );

  // Prepare data for bar chart using the first available goal
  const firstGoalKey = allGoalKeys[0];
  const barChartData = lineChartData.map(entry => ({
    name: entry.weekStart,
    progress: firstGoalKey ? (entry[firstGoalKey] ?? 0) : 0,
    totalProgress: firstGoalKey ? (entry[`total_${firstGoalKey.replace('goal_', '')}`] ?? 0) : 0
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-md p-6 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Progress Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={lineChartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
            <XAxis dataKey="weekStart" className="dark:fill-gray-300" />
            <YAxis className="dark:fill-gray-300" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
              itemStyle={{ color: '#f9fafb' }}
            />
            <Legend />
            {allGoalKeys.map((key) => {
              const goalId = key.replace('goal_', '');
              return (
                <React.Fragment key={key}>
                  <Line
                    type="monotone"
                    dataKey={key}
                    stroke="#3b82f6"
                    activeDot={{ r: 8 }}
                    name={`${key} (Progress %)`}
                  />
                  <Line
                    type="monotone"
                    dataKey={`total_${goalId}`}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    name={`${key} (Total %)`}
                  />
                </React.Fragment>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg shadow-md p-6 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Weekly Progress Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={barChartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
            <XAxis dataKey="name" className="dark:fill-gray-300" />
            <YAxis className="dark:fill-gray-300" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
              itemStyle={{ color: '#f9fafb' }}
            />
            <Legend />
            <Bar dataKey="progress" fill="#10b981" name="Progress (%)" />
            <Bar dataKey="totalProgress" fill="#f59e0b" name="Total Progress (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartView;
