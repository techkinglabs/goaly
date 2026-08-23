import React, { useState } from 'react';
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

import type { ChartDataResponse, Goal } from '../types';

interface ChartViewProps {
  data: ChartDataResponse[];
  isDarkMode: boolean;
  goals?: Goal[];
}

const getLabel = (entry: ChartDataResponse): string => entry.entryDate ?? entry.weekStart ?? '';

const ChartView: React.FC<ChartViewProps> = ({ data, isDarkMode, goals = [] }) => {
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const tooltipBg = isDarkMode ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDarkMode ? '#374151' : '#e2e8f0';
  const tooltipText = isDarkMode ? '#f9fafb' : '#0f172a';
  const gridClassName = isDarkMode ? 'dark:stroke-gray-700' : 'stroke-slate-200';
  const axisClassName = isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500';

  // Transform data for line chart - flatten the goals object into individual fields
  const lineChartData = data
    .slice()
    .sort((a, b) => new Date(getLabel(a)).getTime() - new Date(getLabel(b)).getTime())
    .map(entry => {
      const flat: Record<string, number | string> = { label: getLabel(entry) };
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

  const visibleGoalKeys = goalFilter === 'all'
    ? allGoalKeys
    : allGoalKeys.filter(k => k === `goal_${goalFilter}` || k === `total_${goalFilter}`);

  const firstGoalKey = visibleGoalKeys[0] ?? allGoalKeys[0];
  const barChartData = lineChartData.map(entry => ({
    name: entry.label,
    progress: firstGoalKey ? (entry[firstGoalKey] ?? 0) : 0,
    totalProgress: firstGoalKey ? (entry[`total_${firstGoalKey.replace('goal_', '')}`] ?? 0) : 0
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="form-label !mb-0" htmlFor="chart-goal-filter">Goal:</label>
        <select
          id="chart-goal-filter"
          className="form-input !mb-0 w-auto"
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value)}
        >
          <option value="all">All Goals</option>
          {goals.map(g => (
            <option key={g.id} value={String(g.id)}>{g.name}</option>
          ))}
        </select>
      </div>
      {data.length === 0 ? (
        <p className="text-[var(--text-muted)]">No progress data available</p>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface !mb-0 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={lineChartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className={gridClassName} />
              <XAxis dataKey="label" className={axisClassName} />
              <YAxis className={axisClassName} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
                itemStyle={{ color: tooltipText }}
              />
              <Legend />
              {visibleGoalKeys.map((key) => {
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

        <div className="surface !mb-0 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Period Progress Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className={gridClassName} />
              <XAxis dataKey="name" className={axisClassName} />
              <YAxis className={axisClassName} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
                itemStyle={{ color: tooltipText }}
              />
              <Legend />
              <Bar dataKey="progress" fill="#10b981" name="Progress (%)" />
              <Bar dataKey="totalProgress" fill="#f59e0b" name="Total Progress (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </div>
  );
};

export default ChartView;
