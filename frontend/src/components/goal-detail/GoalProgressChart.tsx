import React, { useMemo, useState } from 'react';
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
import type { ChartRange, Goal } from '../../types';
import { CHART_RANGE_LABELS, CHART_RANGES } from '../../types';
import { useChartData } from '../../hooks/useChartData';
import ChartCard from '../ChartCard';
import EmptyState from '../ui/EmptyState';
import Switch from '../ui/Switch';

interface GoalProgressChartProps {
  goal: Goal;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  isDarkMode: boolean;
}

const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  goal,
  range,
  onRangeChange,
  isDarkMode,
}) => {
  const [showIdealPath, setShowIdealPath] = useState(true);
  const [showTargetLine, setShowTargetLine] = useState(true);

  const { data: chartData, isLoading, error, refetch } = useChartData(range, goal.id);

  const chartDataWithIdeal = useMemo(() => {
    const count = chartData.length;
    if (count === 0) return [];
    return chartData.map((point, index) => ({
      entryDate: point.label,
      dailyProgress: point.goals[goal.id] ?? 0,
      cumulativeProgress: point.totals[goal.id] ?? 0,
      dailyProgressRaw: point.dailyRaw[goal.id] ?? 0,
      cumulativeProgressRaw: point.cumulativeRaw[goal.id] ?? 0,
      idealProgress: (index / (count - 1)) * 100,
    }));
  }, [chartData, goal.id]);

  const maxTotalRaw = useMemo(
    () => chartDataWithIdeal.reduce((max, p) => Math.max(max, p.cumulativeProgressRaw), 0),
    [chartDataWithIdeal]
  );

  const percentDomainMax = useMemo(() => {
    const max = chartDataWithIdeal.reduce(
      (currentMax, point) => Math.max(currentMax, point.cumulativeProgress, point.dailyProgress),
      0
    );
    return Math.max(100, Math.ceil(max / 25) * 25);
  }, [chartDataWithIdeal]);

  const percentTicks = useMemo(() => {
    const ticks = [0, 25, 50, 75, 100];
    for (let value = 125; value <= percentDomainMax; value += 25) ticks.push(value);
    return ticks;
  }, [percentDomainMax]);

  const roundTick = (v: number) => Math.round(v * 100) / 100;

  const rawDomainMax = useMemo(
    () => roundTick(Math.max(maxTotalRaw * 1.1, 1)),
    [maxTotalRaw]
  );

  const rawTicks = useMemo(() => {
    const targetValue = Array.from(chartData).reduce((max, p) => Math.max(max, p.targets[goal.id] ?? 0), 0) * (maxTotalRaw > 0 ? 1 : 0);
    return [
      0,
      roundTick(rawDomainMax / 4),
      roundTick(rawDomainMax / 2),
      roundTick((rawDomainMax * 3) / 4),
      roundTick(rawDomainMax),
    ];
  }, [rawDomainMax, chartData, goal.id]);

  const axisClassName = isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500';
  const gridClassName = isDarkMode ? 'dark:stroke-gray-700' : 'stroke-slate-200';

  if (error) {
    return (
      <div className="pane-detail mb-6">
        <div className="alert alert-danger" role="alert">
          <p>Failed to load chart data: {error.message}</p>
          <button type="button" onClick={() => void refetch()} className="underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

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

      {isLoading || chartDataWithIdeal.length === 0 ? (
        isLoading ? (
          <EmptyState title="Loading chart…" description="Fetching progress data." />
        ) : (
          <EmptyState
            title="No progress data available"
            description="Add an entry for this goal to see the trend."
          />
        )
      ) : (
        <ChartCard title="Progress Trend" fullscreenHeight="80vh" hideTitle>
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataWithIdeal} margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
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
                  tickMargin={10}
                  domain={[0, rawDomainMax]}
                  ticks={rawTicks}
                  tickFormatter={(value) => {
                    const rounded = Math.round(value * 100) / 100;
                    const str = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
                    return `${str} ${goal.unit}`;
                  }}
                />

                {showTargetLine ? (
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
                ) : null}
                {showIdealPath ? (
                  <Line
                    yAxisId="percent"
                    type="linear"
                    dataKey="idealProgress"
                    stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    name="Ideal path"
                    legendType="none"
                  />
                ) : null}
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#f7faff',
                    borderColor: isDarkMode ? '#374151' : '#b8cdf0',
                  }}
                  itemStyle={{ color: isDarkMode ? '#f9fafb' : '#0f172a' }}
                  formatter={(value, name, item) => {
                    if (name === ' ' || name === 'Ideal path') return [null as unknown as string, null as unknown as string];
                    const payload = (item?.payload ?? {}) as Record<string, number>;
                    const raw = name === 'Cumulative progress' ? payload.cumulativeProgressRaw : payload.dailyProgressRaw;
                    return [`${value}% (${raw} ${goal.unit})`, name];
                  }}
                />
                <Legend
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
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
            <div className="absolute bottom-14 right-2 flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--bg-surface)]/80 px-2 py-1.5 backdrop-blur-sm">
              <Switch checked={showIdealPath} onChange={() => setShowIdealPath((prev) => !prev)} label="Ideal Path" />
              <Switch checked={showTargetLine} onChange={() => setShowTargetLine((prev) => !prev)} label="Target" />
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default React.memo(GoalProgressChart);
