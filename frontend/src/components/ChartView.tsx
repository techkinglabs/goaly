import React, { useCallback, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartDataPoint, ChartRange, Goal } from '../types';
import { windowScaledTarget } from '../utils/goalMath';
import ChartCard from './ChartCard';
import EmptyState from './ui/EmptyState';
import Switch from './ui/Switch';

interface ChartViewProps {
    goals: Goal[];
    isDarkMode: boolean;
    data: ChartDataPoint[];
    range: ChartRange;
}

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

const ChartView: React.FC<ChartViewProps> = ({ goals, isDarkMode, data, range: rangeKey }) => {
    const [showIdealPath, setShowIdealPath] = useState(true);
    const [showTargetLine, setShowTargetLine] = useState(true);

    const goalNameMap = useMemo(() => {
        const map = new Map<number, string>();
        for (const goal of goals) map.set(goal.id, goal.name);
        return map;
    }, [goals]);

    const allGoalIds = useMemo(() => goals.map((goal) => goal.id), [goals]);
    const goalIdsKey = useMemo(() => allGoalIds.join(','), [allGoalIds]);

    const [visibleGoals, setVisibleGoals] = useState<Set<number>>(() => new Set(allGoalIds));

    React.useEffect(() => {
        setVisibleGoals((previous) => {
            const next = new Set<number>();
            for (const id of allGoalIds) {
                if (previous.size === 0 || previous.has(id)) next.add(id);
            }
            if (next.size === previous.size && [...next].every((id) => previous.has(id))) {
                return previous;
            }
            return next;
        });
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

    const chartData = useMemo(() => {
        return data.map((point) => {
            const row: Record<string, unknown> = { entryDate: point.label };
            for (const id of visibleGoalIds) {
                row[`goal_${id}`] = point.goals[id] ?? 0;
                row[`total_${id}`] = point.totals[id] ?? 0;
                row[`ideal_${id}`] = point.idealPaths[id] ?? 0;
                row[`raw_${id}`] = point.dailyRaw[id] ?? 0;
                row[`cumRaw_${id}`] = point.cumulativeRaw[id] ?? 0;
            }
            return row;
        });
    }, [data, visibleGoalIds]);

    const percentDomainMax = useMemo(() => {
        const max = data.reduce((currentMax, point) => {
            let dayMax = currentMax;
            for (const id of visibleGoalIds) {
                dayMax = Math.max(dayMax, point.goals[id] ?? 0, point.totals[id] ?? 0);
            }
            return dayMax;
        }, 0);
        return Math.max(100, Math.ceil(max / 25) * 25);
    }, [data, visibleGoalIds]);

    const percentTicks = useMemo(() => {
        const ticks = [0, 25, 50, 75, 100];
        for (let value = 125; value <= percentDomainMax; value += 25) ticks.push(value);
        return ticks;
    }, [percentDomainMax]);

    const rawDomainMax = useMemo(() => {
        const dataMax = data.reduce((currentMax, point) => {
            let rawMax = currentMax;
            for (const id of visibleGoalIds) {
                rawMax = Math.max(rawMax, point.cumulativeRaw[id] ?? 0);
            }
            return rawMax;
        }, 0);
        // Anchor at least to each visible goal's window target so the "Target"
        // reference line on the right axis is always visible (e.g. 60/week × 30d
        // = ~257, not just max(data) × 1.1 = ~145).
        const targetMax = visibleGoalIds.reduce(
            (max, id) => {
                const goal = goals.find((g) => g.id === id);
                if (!goal) return max;
                return Math.max(max, windowScaledTarget(goal, rangeKey));
            },
            0,
        );
        const combined = Math.max(dataMax, targetMax);
        return combined > 0 ? Math.round(combined * 1.1) : 1;
    }, [data, visibleGoalIds, goals]);

    const goalTargets = useMemo(
        () =>
            visibleGoalIds.map((id) => {
                const goal = goals.find((g) => g.id === id);
                return { id, target: goal ? windowScaledTarget(goal, rangeKey) : 0 };
            }),
        [visibleGoalIds, goals],
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

    return (
        <div>
            {import.meta.env.DEV && (
                <div className="rounded bg-yellow-100 p-2 text-xs text-yellow-900">
                    Debug: goals={goals.length} ({goals.map(g => g.id).join(',')}), visibleGoalIds={visibleGoalIds.length}, chartData={chartData.length}, dataPoints={data.length}
                </div>
            )}
            <div className="mb-4 flex items-center justify-between gap-3">
                <span className="form-label mb-0">Goals:</span>
                <div className="flex flex-wrap items-center gap-2">
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
                    {allGoalIds.length === 0 ? <span className="text-[var(--text-muted)]">No goals</span> : null}
                </div>
                <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 shadow-sm">
                    <Switch checked={showIdealPath} onChange={() => setShowIdealPath(p => !p)} label="Ideal Path" />
                    <div className="h-4 w-px bg-[var(--border)]" />
                    <Switch checked={showTargetLine} onChange={() => setShowTargetLine(p => !p)} label="Target" />
                </div>
            </div>

            {chartData.length === 0 ? (
                <EmptyState
                    title="No progress data available"
                    description="Log a daily entry to start seeing your progress here."
                />
            ) : (
                <ChartCard title="Progress Over Time" fullscreenHeight="80vh">
                    <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 55, left: 10, bottom: 35 }}>
                                <CartesianGrid strokeDasharray="3 3" className={gridClassName} opacity={0.3} />
                                <XAxis dataKey="entryDate" className={axisClassName} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis yAxisId="left" className={axisClassName} domain={[0, percentDomainMax]} ticks={percentTicks} tickFormatter={v => `${v}%`} width={50} />
                                <YAxis yAxisId="right" orientation="right" className={axisClassName} domain={[0, rawDomainMax]} tickFormatter={v => `${v}`} width={55} />

                                {showTargetLine && (
                                    <ReferenceLine yAxisId="left" y={100} stroke={isDarkMode ? '#9ca3af' : '#94a3b8'} strokeDasharray="4 4" />
                                )}
                                {showTargetLine && goalTargets.map(({ id, target }) =>
                                    target > 0 ? (
                                        <ReferenceLine
                                            key={`target-raw-${id}`}
                                            yAxisId="right"
                                            y={target}
                                            stroke={isDarkMode ? '#9ca3af' : '#94a3b8'}
                                            strokeDasharray="4 4"
                                            label={{
                                                value: `Target (${Math.round(target)})`,
                                                position: 'insideTopRight',
                                                fill: isDarkMode ? '#9ca3af' : '#64748b',
                                                fontSize: 11,
                                            }}
                                        />
                                    ) : null,
                                )}

                                <Tooltip {...tooltipStyles} />
                                <Legend wrapperStyle={{ paddingTop: 20 }} />

                                {visibleGoalIds.map((id, index) => {
                                    const color = colorForIndex(index);
                                    const unit = goalNameMap.get(id) ?? String(id);
                                    return (
                                        <React.Fragment key={id}>
                                            <Line yAxisId="left" type="monotone" dataKey={`goal_${id}`} stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={`Daily progress (${unit})`} />
                                            <Line yAxisId="left" type="monotone" dataKey={`total_${id}`} stroke={color} strokeWidth={2} strokeDasharray="5 5" dot={false} name={`Cumulative (${unit})`} />
                                            <Line yAxisId="right" type="monotone" dataKey={`cumRaw_${id}`} stroke={color} strokeWidth={1} strokeDasharray="3 2" dot={false} opacity={0.4} name={`Cumulative raw (${unit})`} />
                                            {showIdealPath && (
                                                <Line yAxisId="left" type="linear" dataKey={`ideal_${id}`} stroke={isDarkMode ? '#9ca3af' : '#64748b'} strokeWidth={1} strokeDasharray="8 4" dot={false} isAnimationActive={false} name={`Ideal path (${unit})`} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            )}
        </div>
    );
};

export default React.memo(ChartView);
