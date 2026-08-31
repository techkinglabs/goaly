import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartRange, DailyEntry, Goal } from '../../types';
import { CHART_RANGE_LABELS, CHART_RANGES } from '../../types';
import { buildProgressSeries } from '../../utils/goalMath';
import ChartCard from '../ChartCard';
import EmptyState from '../ui/EmptyState';

interface GoalProgressChartProps {
  goal: Goal;
  entries: DailyEntry[];
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  isDarkMode: boolean;
}

/** Per-goal progress trend. All derived data is memoized. */
const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  goal,
  entries,
  range,
  onRangeChange,
  isDarkMode,
}) => {
  const chartData = useMemo(
    () => buildProgressSeries(entries, goal, range),
    [entries, goal, range]
  );

  const maxTotalRaw = useMemo(
    () => chartData.reduce((max, point) => Math.max(max, point.cumulativeProgressRaw), 0),
    [chartData]
  );

  const percentDomainMax = useMemo(() => {
    const max = chartData.reduce(
      (currentMax, point) => Math.max(currentMax, point.cumulativeProgress, point.dailyProgress),
      0
    );
    return Math.max(100, Math.ceil(max / 25) * 25);
  }, [chartData]);

  const percentTicks = useMemo(() => {
    const ticks = [0, 25, 50, 75, 100];
    for (let value = 125; value <= percentDomainMax; value += 25) ticks.push(value);
    return ticks;
  }, [percentDomainMax]);

  const rawTicks = useMemo(() => {
    const { targetValue } = goal;
    return [
      0,
      targetValue / 4,
      targetValue / 2,
      (targetValue * 3) / 4,
      targetValue,
      Math.max(targetValue, maxTotalRaw),
    ];
  }, [goal, maxTotalRaw]);

  const axisClassName = isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500';
  const gridClassName = isDarkMode ? 'dark:stroke-gray-700' : 'stroke-slate-200';

  return (
    <div className="pane-detail mb-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Progress Trend</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Chart range">
          {CHART_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRangeChange(option)}
              aria-pressed={range === option}
              className={range === option ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              {CHART_RANGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <EmptyState
          title="No progress data available"
          description="Add an entry for this goal to see the trend."
        />
      ) : (
        <ChartCard title="Progress Trend" fullscreenHeight="80vh" hideTitle>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className={gridClassName} />
              <XAxis dataKey="entryDate" className={axisClassName} tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="percent"
                className={axisClassName}
                domain={[0, percentDomainMax]}
                ticks={percentTicks}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                yAxisId="raw"
                orientation="right"
                className={axisClassName}
                domain={[0, Math.max(goal.targetValue, maxTotalRaw)]}
                ticks={rawTicks}
                tickFormatter={(value) => `${value} ${goal.unit}`}
              />

              <ReferenceLine
                yAxisId="percent"
                y={100}
                stroke={isDarkMode ? '#9ca3af' : '#94a3b8'}
                strokeDasharray="4 4"
                label={{
                  value: 'Target (100%)',
                  position: 'insideTopRight',
                  fill: isDarkMode ? '#9ca3af' : '#64748b',
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#f7faff',
                  borderColor: isDarkMode ? '#374151' : '#b8cdf0',
                }}
                itemStyle={{ color: isDarkMode ? '#f9fafb' : '#0f172a' }}
                formatter={(value, name, item) => {
                  if (name === ' ') return [null as unknown as string, null as unknown as string];
                  const payload = (item?.payload ?? {}) as Record<string, number>;
                  const raw = name === 'Cumulative progress' ? payload.cumulativeProgressRaw : payload.dailyProgressRaw;
                  return [`${value}% (${raw} ${goal.unit})`, name];
                }}
              />
              <Legend
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  // Force a stable legend order: Daily progress first, then Cumulative progress.
                  const order = ['Daily progress', 'Cumulative progress'];
                  const sorted = [...payload].sort((a, b) => {
                    const av = a.value ?? '';
                    const bv = b.value ?? '';
                    return order.indexOf(av) - order.indexOf(bv);
                  });
                  return (
                    <ul className="flex flex-wrap items-center justify-center gap-4 pt-2">
                      {sorted.map((entry, index) => (
                        <li
                          key={`${entry.value}-${index}`}
                          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]"
                        >
                          <span
                            className="inline-block h-2.5 w-4 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.value}
                        </li>
                      ))}
                    </ul>
                  );
                }}
              />
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="dailyProgress"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Daily progress"
              />
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="cumulativeProgress"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                name="Cumulative progress"
              />
              {/* Invisible series that anchors the right-hand raw axis. Declared last
                  and excluded from the legend so it never affects legend order. */}
              <Line
                yAxisId="raw"
                type="monotone"
                dataKey="cumulativeProgressRaw"
                stroke="transparent"
                strokeWidth={0}
                dot={false}
                activeDot={false}
                legendType="none"
                name=" "
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
};

export default React.memo(GoalProgressChart);
