import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Goal } from '../types';
import type { FlatChartRow } from '../hooks/useChartData';
import ChartCard from './ChartCard';
import EmptyState from './ui/EmptyState';

interface ChartViewProps {
  rows: FlatChartRow[];
  isDarkMode: boolean;
  goals?: Goal[];
}

/** Stable palette so each goal keeps its colour across renders. */
const SERIES_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
] as const;

const colorForIndex = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length];

const ChartView: React.FC<ChartViewProps> = ({ rows, isDarkMode, goals = [] }) => {
  const tooltipStyles = useMemo(
    () => ({
      contentStyle: {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#374151' : '#e2e8f0',
      },
      itemStyle: { color: isDarkMode ? '#f9fafb' : '#0f172a' },
    }),
    [isDarkMode]
  );

  const gridClassName = isDarkMode ? 'dark:stroke-gray-700' : 'stroke-slate-200';
  const axisClassName = isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500';

  const goalNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const goal of goals) map.set(goal.id, goal.name);
    return map;
  }, [goals]);

  const allGoalIds = useMemo(() => goals.map((goal) => goal.id), [goals]);
  const goalIdsKey = useMemo(() => allGoalIds.join(','), [allGoalIds]);

  const [visibleGoals, setVisibleGoals] = useState<Set<number>>(() => new Set(allGoalIds));

  /**
   * BUGFIX: this reconciliation used to run *during render* via
   * `if (goalIdsKey !== prevGoalIds) { setPrevGoalIds(...); setVisibleGoals(...) }`,
   * which is an illegal side effect in the render phase. It now runs in an
   * effect keyed on the goal-id list, preserving the previous behaviour:
   * newly added goals become visible, removed goals drop out, and explicit
   * user de-selections are kept.
   */
  useEffect(() => {
    setVisibleGoals((previous) => {
      const next = new Set<number>();
      for (const id of allGoalIds) {
        if (previous.size === 0 || previous.has(id)) next.add(id);
      }
      // Avoid a redundant state update when nothing actually changed.
      if (next.size === previous.size && [...next].every((id) => previous.has(id))) {
        return previous;
      }
      return next;
    });
    // `goalIdsKey` is the stable primitive identity of `allGoalIds`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalIdsKey]);

  const toggleGoal = useCallback((id: number) => {
    setVisibleGoals((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleGoalIds = useMemo(
    () => allGoalIds.filter((id) => visibleGoals.has(id)),
    [allGoalIds, visibleGoals]
  );

  const firstGoalId = visibleGoalIds[0] ?? allGoalIds[0];

  // Memoized so the bar dataset is not rebuilt on unrelated re-renders.
  const barChartData = useMemo(() => {
    if (firstGoalId == null) return [];
    return rows.map((row) => ({
      name: row.label,
      dailyProgress: row[`goal_${firstGoalId}`] ?? 0,
      cumulativeProgress: row[`total_${firstGoalId}`] ?? 0,
    }));
  }, [rows, firstGoalId]);

  const lineSeries = useMemo(
    () =>
      visibleGoalIds.map((id, index) => ({
        id,
        name: goalNameMap.get(id) ?? String(id),
        color: colorForIndex(index),
      })),
    [visibleGoalIds, goalNameMap]
  );

  const firstGoalName = firstGoalId != null ? goalNameMap.get(firstGoalId) : undefined;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="form-label mb-0">Goals:</span>
        {allGoalIds.map((id) => (
          <label
            key={id}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-sm surface"
          >
            <input
              type="checkbox"
              checked={visibleGoals.has(id)}
              onChange={() => toggleGoal(id)}
              className="accent-[var(--accent)]"
            />
            {goalNameMap.get(id) ?? `goal_${id}`}
          </label>
        ))}
        {allGoalIds.length === 0 ? (
          <span className="text-[var(--text-muted)]">No goals</span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No progress data available"
          description="Log a daily entry to start seeing your progress here."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <ChartCard title="Progress Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className={gridClassName} />
                <XAxis dataKey="label" className={axisClassName} />
                <YAxis className={axisClassName} />
                <Tooltip {...tooltipStyles} />
                <Legend />
                {lineSeries.map((series) => (
                  <React.Fragment key={series.id}>
                    <Line
                      type="monotone"
                      dataKey={`goal_${series.id}`}
                      stroke={series.color}
                      activeDot={{ r: 8 }}
                      name={`${series.name} (Progress %)`}
                    />
                    <Line
                      type="monotone"
                      dataKey={`total_${series.id}`}
                      stroke={series.color}
                      strokeDasharray="5 5"
                      name={`${series.name} (Total %)`}
                    />
                  </React.Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={
              firstGoalName
                ? `Period Progress Comparison — ${firstGoalName}`
                : 'Period Progress Comparison'
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className={gridClassName} />
                <XAxis dataKey="name" className={axisClassName} />
                <YAxis className={axisClassName} />
                <Tooltip {...tooltipStyles} />
                <Legend />
                <Bar dataKey="progress" fill="#10b981" name="Daily Progress (%)" />
                <Bar dataKey="totalProgress" fill="#f59e0b" name="Cumulative Progress (%)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
};

export default React.memo(ChartView);
