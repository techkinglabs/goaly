import React, { useState, useMemo } from 'react';
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
import ChartCard from './ChartCard';

interface ChartViewProps {
  data: ChartDataResponse[];
  isDarkMode: boolean;
  goals?: Goal[];
}

const getLabel = (entry: ChartDataResponse): string => entry.entryDate ?? entry.weekStart ?? '';

const ChartView: React.FC<ChartViewProps> = ({ data, isDarkMode, goals = [] }) => {
  const tooltipBg = isDarkMode ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDarkMode ? '#374151' : '#e2e8f0';
  const tooltipText = isDarkMode ? '#f9fafb' : '#0f172a';
  const gridClassName = isDarkMode ? 'dark:stroke-gray-700' : 'stroke-slate-200';
  const axisClassName = isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500';

  const goalNameMap = useMemo(() => {
    const map = new Map<number, string>();
    goals.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [goals]);

  // All goals (from props) so every goal can be toggled, even without data yet
  const allGoalIds = useMemo(() => goals.map((g) => g.id), [goals]);

  // Default: all goals visible
  const [visibleGoals, setVisibleGoals] = useState<Set<number>>(() => new Set(allGoalIds));

  // Keep visible set in sync if goals list changes (e.g. new goal added)
  const [prevGoalIds, setPrevGoalIds] = useState<string>(allGoalIds.join(','));
  const goalIdsKey = allGoalIds.join(',');
  if (goalIdsKey !== prevGoalIds) {
    setPrevGoalIds(goalIdsKey);
    setVisibleGoals((prev) => {
      const next = new Set<number>();
      allGoalIds.forEach((id) => {
        if (prev.size === 0 || prev.has(id)) next.add(id);
      });
      return next;
    });
  }

  const toggleGoal = (id: number) => {
    setVisibleGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleGoalIds = allGoalIds.filter((id) => visibleGoals.has(id));

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

  const firstGoalId = visibleGoalIds[0] ?? allGoalIds[0];
  const barChartData = lineChartData.map(entry => ({
    name: entry.label,
    progress: firstGoalId != null ? (entry[`goal_${firstGoalId}`] ?? 0) : 0,
    totalProgress: firstGoalId != null ? (entry[`total_${firstGoalId}`] ?? 0) : 0
  }));

  const lineChart = (
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
        {visibleGoalIds.map((id) => (
          <React.Fragment key={id}>
            <Line
              type="monotone"
              dataKey={`goal_${id}`}
              stroke="#3b82f6"
              activeDot={{ r: 8 }}
              name={`${goalNameMap.get(id) ?? id} (Progress %)`}
            />
            <Line
              type="monotone"
              dataKey={`total_${id}`}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              name={`${goalNameMap.get(id) ?? id} (Total %)`}
            />
          </React.Fragment>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const barChart = (
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
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="form-label !mb-0">Goals:</span>
        {allGoalIds.map((id) => {
          const checked = visibleGoals.has(id);
          return (
            <label key={id} className="inline-flex items-center gap-1 cursor-pointer text-sm px-2 py-1 rounded surface border border-[var(--border)]">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleGoal(id)}
                className="accent-[var(--accent)]"
              />
              {goalNameMap.get(id) ?? `goal_${id}`}
            </label>
          );
        })}
        {allGoalIds.length === 0 && (
          <span className="text-[var(--text-muted)]">No goals</span>
        )}
      </div>
      {data.length === 0 ? (
        <p className="text-[var(--text-muted)]">No progress data available</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ChartCard title="Progress Over Time">{lineChart}</ChartCard>
          <ChartCard title="Period Progress Comparison">{barChart}</ChartCard>
        </div>
      )}
    </div>
  );
};

export default ChartView;
