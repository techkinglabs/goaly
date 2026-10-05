import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartRange, Goal } from '../types';
import type { ProgressPoint } from '../utils/goalMath';
import ChartCard from './ChartCard';
import EmptyState from './ui/EmptyState';
import Switch from './ui/Switch';

interface ChartViewProps {
    goals: Goal[];
    isDarkMode: boolean;
    range: ChartRange;
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

const ChartView: React.FC<ChartViewProps> = ({ goals, isDarkMode, range, seriesByGoalId }) => {
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

    useEffect(() => {
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

    const tooltipStyles = useMemo(
        () => ({
            contentStyle: {
                backgroundColor: isDarkMode? '#1f2937' : '#ffffff',
                borderColor: isDarkMode? '#374151' : '#e2e8f0',
            },
            itemStyle: { color: isDarkMode? '#f9fafb' : '#0f172a' },
        }),
        [isDarkMode]
    );

    const gridClassName = isDarkMode? 'dark:stroke-gray-700' : 'stroke-slate-200';
    const axisClassName = isDarkMode? 'dark:fill-gray-300' : 'fill-slate-500';

    const chartData = useMemo(() => {
        const merged = new Map<string, Record<string, unknown>>();
        for (const id of visibleGoalIds) {
            const points = seriesByGoalId.get(id);
            if (!points) continue;
            const count = points.length;
            for (const point of points) {
                const row = merged.get(point.entryDate)?? { entryDate: point.entryDate };
                row[`goal_${id}`] = point.dailyProgress;
                row[`total_${id}`] = point.cumulativeProgress;
                merged.set(point.entryDate, row);
            }
            points.forEach((point, index) => {
                const row = merged.get(point.entryDate)!;
                const idealPct = count > 1? (index / (count - 1)) * 100 : 0;
                row[`ideal_${id}`] = idealPct;
            });
        }
        return Array.from(merged.values()).sort((a, b) =>
            String(a.entryDate).localeCompare(String(b.entryDate))
        );
    }, [visibleGoalIds, seriesByGoalId, goals, range]);

    const lineSeries = useMemo(
        () =>
            visibleGoalIds.map((id, index) => ({
                id,
                name: goalNameMap.get(id)?? String(id),
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
                        {goalNameMap.get(id)?? `goal_${id}`}
                    </label>
                ))}
                {allGoalIds.length === 0? <span className="text-[var(--text-muted)]">No goals</span> : null}
            </div>

            {chartData.length === 0? (
                <EmptyState
                    title="No progress data available"
                    description="Log a daily entry to start seeing your progress here."
                />
            ) : (
                <div className="grid grid-cols-1 items-start gap-6">
                    <ChartCard title="Progress Over Time" fullscreenHeight="80vh">
                        {/* TOTO JE FIX - uz nie absolute bottom-14 / top-3 */}
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-[var(--text-muted)]">
                                {/* volitelne miesto pre info */}
                            </div>
                            <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 shadow-sm">
                                <Switch checked={showIdealPath} onChange={() => setShowIdealPath(p =>!p)} label="Ideal Path" />
                                <div className="h-4 w-px bg-[var(--border)]" />
                                <Switch checked={showTargetLine} onChange={() => setShowTargetLine(p =>!p)} label="Target" />
                            </div>
                        </div>

                        <div className="h- w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 55, left: 10, bottom: 35 }}>
                                    <CartesianGrid strokeDasharray="3 3" className={gridClassName} opacity={0.3} />
                                    <XAxis dataKey="entryDate" className={axisClassName} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                    {/* Lava os - percenta */}
                                    <YAxis yAxisId="left" className={axisClassName} domain={[0, 100]} tickFormatter={v => `${v}%`} width={50} />
                                    {/* Prava os - minuty, 34 min = 100% podla tvojho screenu */}
                                    <YAxis yAxisId="right" orientation="right" className={axisClassName} domain={[0, 34]} tickFormatter={v => `${v} min`} width={55} />

                                    {showTargetLine && (
                                        <ReferenceLine yAxisId="left" y={100} stroke={isDarkMode? '#9ca3af' : '#94a3b8'} strokeDasharray="4 4" />
                                    )}

                                    <Tooltip {...tooltipStyles} />
                                    <Legend wrapperStyle={{ paddingTop: 20 }} />

                                    {lineSeries.map((series) => (
                                        <React.Fragment key={series.id}>
                                            <Line yAxisId="left" type="monotone" dataKey={`goal_${series.id}`} stroke={series.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Daily progress" />
                                            <Line yAxisId="left" type="monotone" dataKey={`total_${series.id}`} stroke={series.color} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Cumulative progress" />
                                            {showIdealPath && (
                                                <Line yAxisId="left" type="linear" dataKey={`ideal_${series.id}`} stroke={isDarkMode? '#9ca3af' : '#64748b'} strokeWidth={1} strokeDasharray="8 4" dot={false} isAnimationActive={false} name="Ideal path" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </div>
            )}
        </div>
    );
};

export default React.memo(ChartView);