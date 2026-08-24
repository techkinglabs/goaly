import React, { useState, useMemo } from 'react';
import type { Goal, DailyEntry, TargetHistoryEntry } from '../types';
import { addTargetHistory, updateTargetHistory, deleteTargetHistory, apiGet, formatDate } from '../api';
import DatePicker from './DatePicker';
import ChartCard from './ChartCard';

// Local-date key (YYYY-MM-DD) without UTC shift — toISOString() would shift by timezone.
const toLocalISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
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
    entryDate: string;
    actualValue: number;
    note?: string | null;
  }) => void;
  onUpdateEntry?: (id: number, updates: { goalId: number; entryDate: string; actualValue: number; targetValue: number; note?: string | null }) => void;
  onEditEntry?: (entry: DailyEntry) => void;
  onDeleteEntry?: (id: number) => void;
  entries: DailyEntry[]; // Added entries prop
  onGoalUpdated?: (goal: Goal) => void;
  isDarkMode: boolean;
}

const PERIOD_LABELS: Record<string, string> = {
  YEAR: 'Year',
  MONTH: 'Month',
  WEEK: 'Week',
  WORKWEEK: 'Workweek',
  WEEKEND: 'Weekend',
  DAY: 'Day',
};

const DAYS_PER_PERIOD: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  WORKWEEK: 5,
  WEEKEND: 2,
  MONTH: 30.4375,
  YEAR: 365.25,
};

const derivePeriodEquivalents = (value: number, period: string): { day: number; week: number; month: number; year: number } => {
  const amount = value || 0;
  const p = (period || 'WEEK').toUpperCase();
  const days = DAYS_PER_PERIOD[p] ?? 7;
  const daily = amount / days;
  return {
    day: daily,
    week: daily * DAYS_PER_PERIOD.WEEK,
    month: daily * DAYS_PER_PERIOD.MONTH,
    year: daily * DAYS_PER_PERIOD.YEAR,
  };
};

const derivePeriodTargets = (goal: Goal): { week?: number; month?: number; year?: number } => {
  const base = goal.amountPerPeriod && goal.amountPerPeriod > 0 ? goal.amountPerPeriod : (goal.targetValue ?? 0);
  const amount = base || 0;
  const period = goal.period ?? 'WEEK';
  const days = DAYS_PER_PERIOD[period] ?? 7;
  const daily = amount / days;
  return {
    week: daily * DAYS_PER_PERIOD.WEEK,
    month: daily * DAYS_PER_PERIOD.MONTH,
    year: daily * DAYS_PER_PERIOD.YEAR,
  };
};

const GoalDetail: React.FC<GoalDetailProps> = ({ goal, goals, onSubmit, onUpdateEntry, onEditEntry, onDeleteEntry, entries, onGoalUpdated, isDarkMode }) => {
  const tooltipBg = isDarkMode ? '#1f2937' : '#f7faff';
  const tooltipBorder = isDarkMode ? '#374151' : '#b8cdf0';
  const tooltipText = isDarkMode ? '#f9fafb' : '#0f172a';
  const [range, setRange] = useState<'7d' | '30d' | '365d' | 'week' | 'year' | 'all'>('week');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');
  const [historyNewValue, setHistoryNewValue] = useState('');
  const [historyNewPeriod, setHistoryNewPeriod] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [editHistoryFrom, setEditHistoryFrom] = useState('');
  const [editHistoryTo, setEditHistoryTo] = useState('');
  const [editHistoryValue, setEditHistoryValue] = useState('');
  const [editHistoryPeriod, setEditHistoryPeriod] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [editHistoryError, setEditHistoryError] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState(() => toLocalISO(new Date()));
  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newError, setNewError] = useState<string | null>(null);

  if (!goal) {
    return (
      <div className="empty-state p-6 h-full flex items-center justify-center">
        <p>Select a goal to view details</p>
      </div>
    );
  }

  const goalEntries = useMemo(() => {
    return entries.filter(entry => entry.goalId === goal.id).sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  }, [entries, goal]);

  const recentEntries = useMemo(() => {
    return [...goalEntries].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [goalEntries]);

  const rangeFrom = useMemo((): Date | null => {
    if (range === 'all') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (range === '7d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return d;
    }
    if (range === '30d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return d;
    }
    if (range === '365d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 364);
      return d;
    }
    if (range === 'week') {
      const d = new Date(today);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return d;
    }
    if (range === 'year') {
      return new Date(today.getFullYear(), 0, 1);
    }
    return null;
  }, [range]);

  const chartData = useMemo(() => {
    const target = goal.targetValue > 0 ? goal.targetValue : 1;

    if (rangeFrom === null) {
      const byDate = new Map<string, number>();
      goalEntries.forEach((e) => byDate.set(e.entryDate, (byDate.get(e.entryDate) ?? 0) + e.actualValue));
      const sortedDates = [...byDate.keys()].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      let runningTotal = 0;
      return sortedDates.map((date) => {
        const dayValue = byDate.get(date) ?? 0;
        const progress = (dayValue / target) * 100;
        runningTotal += dayValue;
        const totalProgress = (runningTotal / target) * 100;
        return {
          entryDate: date,
          progress: Math.round(progress * 10) / 10,
          progressRaw: dayValue,
          totalProgress: Math.round(totalProgress * 10) / 10,
          totalRaw: runningTotal,
        };
      });
    }

    const from = new Date(rangeFrom);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For "this week" (Mon-Sun) show the entire week, including future days
    // of the current week, so entries already logged later in the week appear.
    let rangeTo = new Date(today);
    if (range === 'week') {
      const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      rangeTo = new Date(today);
      rangeTo.setDate(today.getDate() + (6 - dayOfWeek)); // advance to Sunday
    }

    const entriesByDate = new Map<string, number>();
    goalEntries.forEach((e) => entriesByDate.set(e.entryDate, (entriesByDate.get(e.entryDate) ?? 0) + e.actualValue));

    const runningBefore = goalEntries
      .filter((e) => parseLocalDate(e.entryDate) < from)
      .reduce((sum, e) => sum + e.actualValue, 0);

    const points: Array<{
      entryDate: string;
      progress: number;
      progressRaw: number;
      totalProgress: number;
      totalRaw: number;
    }> = [];

    let runningTotal = runningBefore;
    for (let d = new Date(from); d <= rangeTo; d.setDate(d.getDate() + 1)) {
      const key = toLocalISO(d);
      const dayValue = entriesByDate.get(key) ?? 0;
      if (dayValue > 0) {
        const progress = (dayValue / target) * 100;
        runningTotal += dayValue;
        const totalProgress = (runningTotal / target) * 100;
        points.push({
          entryDate: key,
          progress: Math.round(progress * 10) / 10,
          progressRaw: dayValue,
          totalProgress: Math.round(totalProgress * 10) / 10,
          totalRaw: runningTotal,
        });
      } else {
        const totalProgress = (runningTotal / target) * 100;
        points.push({
          entryDate: key,
          progress: 0,
          progressRaw: 0,
          totalProgress: Math.round(totalProgress * 10) / 10,
          totalRaw: runningTotal,
        });
      }
    }

    return points;
  }, [goalEntries, rangeFrom, goal]);

  const maxTotalRaw = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((m, d) => Math.max(m, d.totalRaw), 0);
  }, [chartData]);

  const percentDomainMax = useMemo(() => {
    const max = chartData.reduce((m, d) => Math.max(m, d.totalProgress, d.progress), 0);
    return Math.max(100, Math.ceil(max / 25) * 25);
  }, [chartData]);

  const percentTicks = useMemo(() => {
    const ticks: number[] = [0, 25, 50, 75, 100];
    for (let v = 125; v <= percentDomainMax; v += 25) ticks.push(v);
    return ticks;
  }, [percentDomainMax]);

  const totalActual = useMemo(() => {
    return goalEntries.reduce((sum, entry) => sum + entry.actualValue, 0);
  }, [goalEntries]);

  const progressPercentage = goal.targetValue > 0 ? (totalActual / goal.targetValue) * 100 : 0;

  const derived = derivePeriodTargets(goal);

  const delivered = useMemo(() => {
    const target = goal.targetValue > 0 ? goal.targetValue : 0;
    return {
      actual: totalActual,
      target,
      percent: target > 0 ? (totalActual / target) * 100 : 0,
      hit: target > 0 && totalActual >= target,
    };
  }, [totalActual, goal.targetValue]);

  const weeklyChange = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = (now.getDay() + 6) % 7;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - day);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const sumRange = (start: Date, end: Date) =>
      goalEntries
        .filter((e) => {
          const d = parseLocalDate(e.entryDate);
          return d >= start && d < end;
        })
        .reduce((s, e) => s + e.actualValue, 0);

    const nowEnd = new Date(now);
    nowEnd.setHours(23, 59, 59, 999);
    const thisWeek = sumRange(thisWeekStart, nowEnd);
    const lastWeek = sumRange(lastWeekStart, thisWeekStart);

    if (lastWeek === 0) {
      return { thisWeek, lastWeek, changePct: thisWeek > 0 ? 100 : 0, hasChange: thisWeek > 0 };
    }
    return { thisWeek, lastWeek, changePct: ((thisWeek - lastWeek) / lastWeek) * 100, hasChange: true };
  }, [goalEntries]);

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setHistoryError(null);
    if (!newValidFrom || historyNewValue === '') {
      setHistoryError('Please provide a date and value.');
      return;
    }
    try {
      await addTargetHistory(goal.id, newValidFrom, Number(historyNewValue), newValidTo || null, historyNewPeriod);
      const refreshed = await apiGet<Goal>(`/api/goals/${goal.id}`);
      if (onGoalUpdated) onGoalUpdated(refreshed);
      setNewValidFrom('');
      setNewValidTo('');
      setHistoryNewValue('');
      setHistoryNewPeriod('WEEK');
      setHistoryOpen(false);
    } catch (err: any) {
      setHistoryError(err?.message || 'Failed to add target change.');
    }
  };

  const PERIOD_OPTIONS: Array<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'> = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

  const cancelAddTarget = () => {
    setHistoryOpen(false);
    setHistoryError(null);
  };

  const handleFormKeyDown = (
    onEnter?: () => void,
    onEscape?: () => void
  ) => (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
    } else if (e.key === 'Enter' && onEnter && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div>
      <div className="pane-detail mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-3 h-3 rounded-full ${goal.isActive ? 'bg-green-500' : 'bg-red-500'}`}
              title={goal.isActive ? 'Active' : 'Inactive'}
              aria-label={goal.isActive ? 'Active' : 'Inactive'}
            />
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{goal.name}</h2>
          </div>
          <p className="text-[var(--text-secondary)] mt-1">{goal.description || 'No description'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="stat-tile">
            <p className="text-sm text-[var(--text-muted)]">Progress</p>
            <p className="text-xl font-semibold text-[var(--text-primary)]">{progressPercentage.toFixed(1)}%</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Calculated from weekly target ({derived.week?.toFixed(1)} {goal.unit}/wk)</p>
          </div>
          <div className="stat-tile">
            <p className="text-sm text-[var(--text-muted)]">Delivered Target</p>
            <p className="text-xl font-semibold text-[var(--text-primary)]">{delivered.actual.toFixed(1)} / {delivered.target} {goal.unit}</p>
            <p className={`text-xs mt-1 ${delivered.hit ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'}`}>
              {delivered.percent.toFixed(1)}% of target {delivered.hit ? '— Target reached ✅' : '— Not reached yet'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="stat-tile mb-0">
            <p className="text-sm text-[var(--text-muted)] mb-2">Weekly Change</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[var(--text-muted)]">This Week</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{weeklyChange.thisWeek.toFixed(1)} {goal.unit}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Last Week</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{weeklyChange.lastWeek.toFixed(1)} {goal.unit}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Change</p>
                {weeklyChange.hasChange ? (
                  <p className={`text-lg font-semibold ${weeklyChange.changePct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {weeklyChange.changePct >= 0 ? '+' : ''}{weeklyChange.changePct.toFixed(1)}%
                    <span className="text-xs font-normal"> ({weeklyChange.changePct >= 0 ? 'more' : 'less'} than last week)</span>
                  </p>
                ) : (
                  <p className="text-lg font-semibold text-[var(--text-primary)]">—</p>
                )}
              </div>
            </div>
          </div>

          <div className="stat-tile mb-0">
            <p className="text-sm text-[var(--text-muted)] mb-2">Derived Targets</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Per Week</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{derived.week?.toFixed(1)} {goal.unit}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Per Month</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{derived.month?.toFixed(1)} {goal.unit}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Per Year</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{derived.year?.toFixed(1)} {goal.unit}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="pane-detail mb-6">
        <div className="flex flex-wrap items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Progress Trend</h3>
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', '365d', 'week', 'year', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={range === r ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : r === '365d' ? 'Last 365 days' : r === 'week' ? 'This Week' : r === 'year' ? 'This Year' : 'All'}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ChartCard title="Progress Trend" fullscreenHeight="80vh" hideTitle>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className={isDarkMode ? 'dark:stroke-gray-700' : 'stroke-slate-200'} />
                <XAxis
                  dataKey="entryDate"
                  className={isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500'}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="percent"
                  className={isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500'}
                  domain={[0, percentDomainMax]}
                  ticks={percentTicks}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  yAxisId="raw"
                  orientation="right"
                  className={isDarkMode ? 'dark:fill-gray-300' : 'fill-slate-500'}
                  domain={[0, Math.max(goal.targetValue, maxTotalRaw)]}
                  ticks={[0, goal.targetValue / 4, goal.targetValue / 2, (goal.targetValue * 3) / 4, goal.targetValue, Math.max(goal.targetValue, maxTotalRaw)]}
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
                  stroke={isDarkMode ? '#9ca3af' : '#94a3b8'}
                  strokeDasharray="4 4"
                  label={{ value: 'Target (100%)', position: 'insideTopRight', fill: isDarkMode ? '#9ca3af' : '#64748b', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
                  itemStyle={{ color: tooltipText }}
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
          </ChartCard>
        ) : (
          <p className="text-[var(--text-muted)]">No progress data available</p>
        )}
      </div>

      {/* Target History Section */}
      <div className="pane-detail mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Target History</h3>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="btn btn-primary rounded-full"
            title="Add target change"
            disabled={historyOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {historyOpen && (
          <form onSubmit={handleAddTarget} onKeyDown={handleFormKeyDown(undefined, cancelAddTarget)} className="surface !mb-3 rounded-xl p-4 border border-[var(--border)]" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="form-label">Valid From</label>
                <DatePicker
                  value={newValidFrom}
                  onChange={setNewValidFrom}
                  className="form-input !mb-0"
                  required
                />
              </div>
              <div>
                <label className="form-label">Valid To (optional)</label>
                <DatePicker
                  value={newValidTo}
                  onChange={setNewValidTo}
                  min={newValidFrom || undefined}
                  className="form-input !mb-0"
                />
              </div>
              <div>
                <label className="form-label">New Value ({goal.unit})</label>
                <input
                  type="number"
                  step="1"
                  value={historyNewValue}
                  onChange={(e) => setHistoryNewValue(e.target.value)}
                  className="form-input !mb-0"
                  required
                />
              </div>
              <div>
                <label className="form-label">Per</label>
                <select
                  value={historyNewPeriod}
                  onChange={(e) => setHistoryNewPeriod(e.target.value as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR')}
                  className="form-input !mb-0"
                >
                  {PERIOD_OPTIONS.map((p) => (
                    <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            {historyNewValue !== '' && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Equals ≈ {derivePeriodEquivalents(Number(historyNewValue), historyNewPeriod).day.toFixed(1)}/day,
                {' '}{derivePeriodEquivalents(Number(historyNewValue), historyNewPeriod).week.toFixed(1)}/week,
                {' '}{derivePeriodEquivalents(Number(historyNewValue), historyNewPeriod).month.toFixed(1)}/month,
                {' '}{derivePeriodEquivalents(Number(historyNewValue), historyNewPeriod).year.toFixed(1)}/year
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button type="submit" className="btn" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>
                Save Change
              </button>
              <button
                type="button"
                onClick={cancelAddTarget}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">If Valid To is left empty, the new value stays active forever (until the next change).</p>
            {historyError && <p className="text-red-500 text-sm mt-2">{historyError}</p>}
          </form>
        )}

        {goal.targetHistory && goal.targetHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Valid From</th>
                  <th scope="col">Valid To</th>
                  <th scope="col">Target</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...goal.targetHistory].sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()).map((h: TargetHistoryEntry) => {
                   const isEditing = editingHistoryId === h.id;
                   const eq = derivePeriodEquivalents(Number(h.value), h.period ?? 'WEEK');

                   const acceptHistoryEdit = async () => {
                     if (!editHistoryFrom) { setEditHistoryError('Date is required.'); return; }
                     if (editHistoryValue === '' || isNaN(Number(editHistoryValue))) { setEditHistoryError('Value is required.'); return; }
                     try {
                       await updateTargetHistory(goal.id, h.id, editHistoryFrom, Number(editHistoryValue), editHistoryTo || null, editHistoryPeriod);
                       const refreshed = await apiGet<Goal>(`/api/goals/${goal.id}`);
                       if (onGoalUpdated) onGoalUpdated(refreshed);
                       setEditingHistoryId(null);
                       setEditHistoryError(null);
                     } catch (err: any) {
                       setEditHistoryError(err?.message || 'Failed to update target change.');
                     }
                   };
                   const cancelHistoryEdit = () => { setEditingHistoryId(null); setEditHistoryError(null); };

                   return (
                     <tr key={h.id} onKeyDown={isEditing ? handleFormKeyDown(acceptHistoryEdit, cancelHistoryEdit) : undefined}>
                      {isEditing ? (
                        <td className="whitespace-nowrap text-sm p-1">
                          <DatePicker
                            value={editHistoryFrom}
                            onChange={setEditHistoryFrom}
                            className="form-input !mb-0 w-full"
                          />
                        </td>
                      ) : (
                        <td className="whitespace-nowrap text-sm">{formatDate(h.validFrom)}</td>
                      )}
                      {isEditing ? (
                        <td className="whitespace-nowrap text-sm p-1">
                          <DatePicker
                            value={editHistoryTo}
                            onChange={setEditHistoryTo}
                            min={editHistoryFrom || undefined}
                            className="form-input !mb-0 w-full"
                          />
                        </td>
                      ) : (
                        <td className="whitespace-nowrap text-sm">{h.validTo ? formatDate(h.validTo) : 'Forever'}</td>
                      )}
                      {isEditing ? (
                        <td className="whitespace-nowrap text-sm p-1 space-y-1">
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="1"
                              value={editHistoryValue}
                              onChange={(e) => setEditHistoryValue(e.target.value)}
                              className="form-input !mb-0 w-20"
                            />
                            <select
                              value={editHistoryPeriod}
                              onChange={(e) => setEditHistoryPeriod(e.target.value as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR')}
                              className="form-input !mb-0"
                            >
                              {PERIOD_OPTIONS.map((p) => (
                                <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      ) : (
                        <td className="whitespace-nowrap text-sm">
                          <div className="font-medium">{h.value} {goal.unit}/{PERIOD_LABELS[h.period ?? 'WEEK']}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            ≈ {eq.day.toFixed(1)}/day · {eq.week.toFixed(1)}/wk · {eq.month.toFixed(1)}/mo · {eq.year.toFixed(1)}/yr
                          </div>
                        </td>
                      )}
                      <td className="whitespace-nowrap text-sm">
                        {isEditing ? (
                          <>
                            {editHistoryError && (
                              <p className="text-red-600 dark:text-red-400 text-xs mb-1">{editHistoryError}</p>
                            )}
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={acceptHistoryEdit}
                                 className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1"
                                 title="Accept"
                                 aria-label="Accept changes"
                               >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                 </svg>
                               </button>
                               <button
                                 onClick={cancelHistoryEdit}
                                 className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                                 title="Cancel"
                                 aria-label="Cancel changes"
                               >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingHistoryId(h.id);
                                setEditHistoryFrom(h.validFrom);
                                setEditHistoryTo(h.validTo ?? '');
                                setEditHistoryValue(String(h.value));
                                setEditHistoryPeriod((h.period ?? 'WEEK') as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR');
                                setEditHistoryError(null);
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                              title="Edit"
                              aria-label="Edit target change"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to delete this target change?')) return;
                                try {
                                  await deleteTargetHistory(goal.id, h.id);
                                  const refreshed = await apiGet<Goal>(`/api/goals/${goal.id}`);
                                  if (onGoalUpdated) onGoalUpdated(refreshed);
                                } catch (err: any) {
                                  setHistoryError(err?.message || 'Failed to delete target change.');
                                }
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                              title="Delete"
                              aria-label="Delete target change"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[var(--text-muted)]">No target changes recorded.</p>
        )}
      </div>

      {/* Recent Entries Section */}
      <div className="pane-detail min-h-[70vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Recent Entries</h3>
          <button
            onClick={() => {
              setIsAdding(true);
              setNewDate(toLocalISO(new Date()));
              setNewValue('');
              setNewNote('');
              setNewError(null);
            }}
            className="btn btn-primary rounded-full"
            title="Add Entry"
            disabled={isAdding}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Actual Value</th>
                <th scope="col">Note</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                (() => {
                  const acceptNewEntry = () => {
                    if (!newDate) { setNewError('Date is required.'); return; }
                    if (newValue === '' || isNaN(Number(newValue))) { setNewError('Value is required.'); return; }
                    onSubmit({ goalId: goal.id, entryDate: newDate, actualValue: Number(newValue), note: newNote.trim() || null });
                    setIsAdding(false);
                    setNewError(null);
                  };
                  const cancelNewEntry = () => { setIsAdding(false); setNewError(null); };

                  return (
                <tr onKeyDown={handleFormKeyDown(acceptNewEntry, cancelNewEntry)}>
                  <td className="text-sm p-2 align-top">
                    <DatePicker
                      value={newDate}
                      onChange={setNewDate}
                      className="form-input !mb-0 w-full"
                      autoFocus
                    />
                  </td>
                  <td className="text-sm p-2 align-top">
                    <input
                      type="number"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="form-input !mb-0 w-full"
                      placeholder={goal.unit}
                    />
                  </td>
                  <td className="text-sm p-2 align-top">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="form-input !mb-0 w-full"
                      rows={3}
                      placeholder="Add a note..."
                    />
                  </td>
                  <td className="text-sm p-2 align-top">
                    {newError && (
                      <p className="text-red-600 dark:text-red-400 text-xs mb-1">{newError}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={acceptNewEntry}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1"
                        title="Accept"
                        aria-label="Accept new entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelNewEntry}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                        title="Reject"
                        aria-label="Reject new entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                })()
              )}
              {recentEntries.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={4} className="text-center text-[var(--text-muted)] py-6">
                    No entries yet for this goal
                  </td>
                </tr>
              )}
              {recentEntries.map((entry) => {
                  const isEditing = editingId === entry.id;

                  const acceptEntryEdit = () => {
                    if (!editDate) { setEditError('Date is required.'); return; }
                    if (editValue === '' || isNaN(Number(editValue))) { setEditError('Value is required.'); return; }
                    onUpdateEntry?.(entry.id, {
                      goalId: entry.goalId,
                      entryDate: editDate,
                      actualValue: Number(editValue),
                      targetValue: entry.targetValue,
                      note: editNote.trim() || null,
                    });
                    setEditingId(null);
                    setEditError(null);
                  };
                  const cancelEntryEdit = () => { setEditingId(null); setEditError(null); };

                  return (
                    <tr key={entry.id} onKeyDown={isEditing ? handleFormKeyDown(acceptEntryEdit, cancelEntryEdit) : undefined}>
                      {isEditing ? (
                        <td className="whitespace-nowrap text-sm p-1">
                          <DatePicker
                            value={editDate}
                            onChange={setEditDate}
                            className="form-input !mb-0 w-full"
                          />
                        </td>
                      ) : (
                        <td className="text-sm p-2 align-top">{formatDate(entry.entryDate)}</td>
                      )}
                      {isEditing ? (
                        <td className="text-sm p-2 align-top">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="form-input !mb-0 w-full"
                          />
                        </td>
                      ) : (
                        <td className="text-sm p-2 align-top">{entry.actualValue} {goal.unit}</td>
                      )}
                      {isEditing ? (
                        <td className="text-sm p-2 align-top">
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="form-input !mb-0 w-full"
                            rows={3}
                            placeholder="Add a note..."
                          />
                        </td>
                      ) : (
                        <td className="text-sm p-2 align-top text-[var(--text-secondary)]">{entry.note || <span className="text-[var(--text-muted)]">—</span>}</td>
                      )}
                      <td className="text-sm p-2 align-top">
                        {isEditing ? (
                          <>
                            {editError && (
                              <p className="text-red-600 dark:text-red-400 text-xs mb-1">{editError}</p>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={acceptEntryEdit}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1"
                                title="Accept"
                                aria-label="Accept changes"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEntryEdit}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                                title="Reject"
                                aria-label="Reject changes"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            {onUpdateEntry && (
                              <button
                                onClick={() => {
                                  setEditingId(entry.id);
                                  setEditDate(entry.entryDate);
                                  setEditValue(String(entry.actualValue));
                                  setEditNote(entry.note ?? '');
                                  setEditError(null);
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                title="Edit"
                                aria-label="Edit entry"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {onDeleteEntry && (
                              <button
                                onClick={() => onDeleteEntry(entry.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                                title="Delete"
                                aria-label="Delete entry"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default GoalDetail;
