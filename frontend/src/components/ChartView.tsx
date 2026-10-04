import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Goal } from '../types';
import type { ProgressPoint } from '../utils/goalMath';
import ChartCard from './ChartCard';
import EmptyState from './ui/EmptyState';

interface ChartViewProps {
  goals: Goal[];
  isDarkMode: boolean;
  seriesByGoalId: Map<number, ProgressPoint[]>;
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

const ChartView: React.FC<ChartViewProps> = ({ goals, isDarkMode, seriesByGoalId }) => {
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

  // Merge all visible goals' progress points into a single chart dataset.
  // Each row has: entryDate, dailyProgress, cumulativeProgress (percentages),
  // plus the raw values for tooltip display.
  const chartData = useMemo(() => {
    const merged = new Map<string, Record<string, unknown>>();

    for (const id of visibleGoalIds) {
      const points = seriesByGoalId.get(id);
      if (!points) continue;
      for (const point of points) {
        const row = merged.get(point.entryDate) ?? { entryDate: point.entryDate };
        row[`goal_${id}`] = point.dailyProgress;
        row[`total_${id}`] = point.cumulativeProgress;
        merged.set(point.entryDate, row);
      }
    }

    return Array.from(merged.values()).sort((a, b) =>
      String(a.entryDate).localeCompare(String(b.entryDate))
    );
  }, [visibleGoalIds, seriesByGoalId]);

  const lineSeries = useMemo(
    () =>
      visibleGoalIds.map((id, index) => ({
        id,
        name: goalNameMap.get(id) ?? String(id),
        color: colorForIndex(index),
      })),
    [visibleGoalIds, goalNameMap]
  );

  return (
    <div>
      {import.meta.env.DEV && (
        <div className="rounded bg-yellow-100 p-2 text-xs text-yellow-900">
          Debug: goals={goals.length} ({goals.map(g => g.id).join(',')}), visibleGoalIds={visibleGoalIds.length}, chartData={chartData.length}, seriesByGoalId={Array.from(seriesByGoalId.entries()).map(([k, v]) => `${k}:${v.length}`).join(', ')}
        </div>
      )}
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

      {chartData.length === 0 ? (
        <EmptyState
          title="No progress data available"
          description="Log a daily entry to start seeing your progress here."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6">
          <ChartCard title="Progress Over Time" fullscreenHeight="80vh">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className={gridClassName} />
                <XAxis dataKey="entryDate" className={axisClassName} tick={{ fontSize: 12 }} />
                <YAxis className={axisClassName} />
                <Tooltip
                  {...tooltipStyles}
                  labelFormatter={(label) => label}
                  formatter={(value, name) => [value, name]}
                />
                <Legend
                  content={() => {
                    return (
                      <ul className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        {visibleGoalIds.map((id) => {
                          const series = lineSeries.find((s) => s.id === id);
                          if (!series) return null;
                          return (
                            <li
                              key={id}
                              className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]"
                            >
                              <span
                                className="inline-block h-2.5 w-4 cursor-pointer rounded-sm"
                                style={{ backgroundColor: series.color }}
                                onClick={() => toggleGoal(id)}
                              />
                              <span
                                className="cursor-pointer"
                                onClick={() => toggleGoal(id)}
                              >
                                {series.name}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }}
                />
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
        </div>
      )}
    </div>
  );
};

export default React.memo(ChartView);
