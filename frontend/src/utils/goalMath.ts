/**
 * Pure goal math — no React, no I/O, so it is trivially unit-testable.
 */
import type { ChartRange, DailyEntry, Goal, TargetHistoryEntry } from '../types';
import { addDays, parseLocalDate, startOfWeek, toLocalISODate, today } from './date';

export const DAYS_PER_PERIOD: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  WORKWEEK: 5,
  WEEKEND: 2,
  MONTH: 30.4375,
  YEAR: 365.25,
};

export interface PeriodEquivalents {
  day: number;
  week: number;
  month: number;
  year: number;
}

/** Converts an "amount per period" into day/week/month/year equivalents. */
export function derivePeriodEquivalents(value: number, period: string): PeriodEquivalents {
  const amount = Number.isFinite(value) ? value : 0;
  const days = DAYS_PER_PERIOD[(period || 'WEEK').toUpperCase()] ?? DAYS_PER_PERIOD.WEEK;
  const daily = days > 0 ? amount / days : 0;
  return {
    day: daily,
    week: daily * DAYS_PER_PERIOD.WEEK,
    month: daily * DAYS_PER_PERIOD.MONTH,
    year: daily * DAYS_PER_PERIOD.YEAR,
  };
}

/** Derived week/month/year targets for a goal. */
export function derivePeriodTargets(goal: Goal): PeriodEquivalents {
  const base =
    goal.amountPerPeriod && goal.amountPerPeriod > 0
      ? goal.amountPerPeriod
      : (goal.targetValue ?? 0);
  return derivePeriodEquivalents(base, goal.period ?? 'WEEK');
}

/**
 * The period (e.g. weekly) target valid at `date`, honouring `targetHistory`.
 * Falls back to the goal's own period amount when no history applies.
 */
export function effectivePeriodTarget(goal: Goal, date: Date): number {
  const history = goal.targetHistory;
  if (history && history.length > 0) {
    let best: TargetHistoryEntry | null = null;
    for (const entry of history) {
      const from = parseLocalDate(entry.validFrom);
      if (from <= date && (best === null || from > parseLocalDate(best.validFrom))) {
        best = entry;
      }
    }
    if (best && Number.isFinite(best.value)) return best.value;
  }
  const base =
    goal.amountPerPeriod && goal.amountPerPeriod > 0
      ? goal.amountPerPeriod
      : (goal.targetValue ?? 0);
  return base;
}

/** Returns the ISO `YYYY-MM-DD` of the period-start date that contains `date`. */
export function periodStartForDate(date: Date, period?: string): string {
  const p = (period || 'WEEK').toUpperCase();
  let start: Date;
  switch (p) {
    case 'DAY':
      start = new Date(date);
      break;
    case 'WEEK':
    case 'WORKWEEK':
      start = startOfWeek(date);
      break;
    case 'WEEKEND':
      // Saturday of the week containing `date`.
      start = addDays(startOfWeek(date), 5);
      break;
    case 'MONTH':
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      break;
    case 'YEAR':
      start = new Date(date.getFullYear(), 0, 1);
      break;
    default:
      start = startOfWeek(date);
  }
  return toLocalISODate(start);
}

/** True when `date` is the first day of a goal period (cadence start). */
export function isPeriodStart(date: Date, period?: string): boolean {
  const p = (period || 'WEEK').toUpperCase();
  const dow = date.getDay(); // 0 = Sunday … 6 = Saturday
  switch (p) {
    case 'DAY':
      return true;
    case 'WEEK':
    case 'WORKWEEK':
      return dow === 1; // Monday
    case 'WEEKEND':
      return dow === 6; // Saturday
    case 'MONTH':
      return date.getDate() === 1;
    case 'YEAR':
      return date.getMonth() === 0 && date.getDate() === 1;
    default:
      return dow === 1;
  }
}

/** Inclusive start date for a chart range, or `null` for "all time". */
export function rangeStartDate(range: ChartRange): Date | null {
  const base = today();
  switch (range) {
    case '7d':
      return addDays(base, -6);
    case '30d':
      return addDays(base, -29);
    case '365d':
      return addDays(base, -364);
    case 'week':
      return startOfWeek(base);
    case 'year':
      return new Date(base.getFullYear(), 0, 1);
    case 'all':
    default:
      return null;
  }
}

export interface ProgressPoint {
  entryDate: string;
  dailyProgress: number;
  dailyProgressRaw: number;
  cumulativeProgress: number;
  cumulativeProgressRaw: number;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Builds the cumulative progress series for one goal.
 *
 * Behaviour preserved from the original implementation:
 *  - "all" plots only dates that actually have entries;
 *  - bounded ranges plot every day in the window (so gaps are visible);
 *  - "this week" extends to Sunday so later-in-week entries appear;
 *  - the cumulative "Total Progress" line accumulates only within the visible
 *    range (it starts at 0 at the range start), so a new week begins at 0.
 */
export function buildProgressSeries(
  entries: DailyEntry[],
  goal: Goal,
  range: ChartRange
): ProgressPoint[] {
  const target = goal.targetValue > 0 ? goal.targetValue : 1;
  const period = goal.period;

  const valueByDate = new Map<string, number>();
  for (const entry of entries) {
    valueByDate.set(entry.entryDate, (valueByDate.get(entry.entryDate) ?? 0) + entry.actualValue);
  }

  const from = rangeStartDate(range);

  if (from === null) {
    const sortedDates = [...valueByDate.keys()].sort((a, b) => a.localeCompare(b));
    let runningTotal = 0;
    let runningTarget = 0;
    const creditedPeriods = new Set<string>();
    const firstCursor = parseLocalDate(sortedDates[0]);
    if (!Number.isNaN(firstCursor.getTime())) {
      const ps = periodStartForDate(firstCursor, period);
      if (!creditedPeriods.has(ps)) {
        runningTarget += effectivePeriodTarget(goal, parseLocalDate(ps));
        creditedPeriods.add(ps);
      }
    }
    return sortedDates.map((date) => {
      const cursor = parseLocalDate(date);
      const dayValue = valueByDate.get(date) ?? 0;
      runningTotal += dayValue;
      if (isPeriodStart(cursor, period)) {
        const ps = periodStartForDate(cursor, period);
        if (!creditedPeriods.has(ps)) {
          runningTarget += effectivePeriodTarget(goal, cursor);
          creditedPeriods.add(ps);
        }
      }
      const cumulative = runningTarget > 0 ? (runningTotal / runningTarget) * 100 : 0;
      return {
        entryDate: date,
        dailyProgress: round1((dayValue / target) * 100),
        dailyProgressRaw: dayValue,
        cumulativeProgress: round1(cumulative),
        cumulativeProgressRaw: runningTotal,
      };
    });
  }

  const base = today();
  // For "this week", extend through Sunday to include future days of the week.
  const rangeTo = range === 'week' ? addDays(startOfWeek(base), 6) : base;

  const points: ProgressPoint[] = [];

  // Rolling day-based ranges (7d/30d/365d) measure cumulative progress against
  // the *elapsed time* within the window: the denominator grows proportionally
  // with the number of days that have passed (periodTarget × elapsedDays /
  // daysPerPeriod). A 7-day window is exactly one period of elapsed time, so it
  // always counts one period target even when it straddles two calendar weeks
  // (e.g. Tue→Mon) — avoiding the old bug where the line was 0 until the final
  // day, and avoiding double-counting two calendar weeks for only 7 days.
  const rollingDayRange = range === '7d' || range === '30d' || range === '365d';
  if (rollingDayRange) {
    const daysPerPeriod = DAYS_PER_PERIOD[(period || 'WEEK').toUpperCase()] ?? DAYS_PER_PERIOD.WEEK;
    const totalDays = Math.round((rangeTo.getTime() - from.getTime()) / 86400000) + 1;
    const windowTarget = (effectivePeriodTarget(goal, from) / daysPerPeriod) * totalDays;
    let runningTotal = 0;
    for (let cursor = new Date(from); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
      const key = toLocalISODate(cursor);
      const dayValue = valueByDate.get(key) ?? 0;
      runningTotal += dayValue;
      const cumulative = windowTarget > 0 ? (runningTotal / windowTarget) * 100 : 0;
      points.push({
        entryDate: key,
        dailyProgress: dayValue > 0 ? round1((dayValue / target) * 100) : 0,
        dailyProgressRaw: dayValue,
        cumulativeProgress: round1(cumulative),
        cumulativeProgressRaw: runningTotal,
      });
    }
    return points;
  }

  // Calendar-aligned ranges (week/year) accumulate whole period targets each
  // time a new period starts within the window, so a new week begins at 0% and
  // two full weeks compare actual to the sum of both weeks' targets.
  let runningTotal = 0;
  let runningTarget = 0;
  const creditedPeriods = new Set<string>();

  const firstPs = periodStartForDate(from, period);
  if (!creditedPeriods.has(firstPs)) {
    runningTarget += effectivePeriodTarget(goal, parseLocalDate(firstPs));
    creditedPeriods.add(firstPs);
  }

  for (let cursor = new Date(from); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
    const key = toLocalISODate(cursor);
    const dayValue = valueByDate.get(key) ?? 0;
    runningTotal += dayValue;
    if (isPeriodStart(cursor, period)) {
      const ps = periodStartForDate(cursor, period);
      if (!creditedPeriods.has(ps)) {
        runningTarget += effectivePeriodTarget(goal, cursor);
        creditedPeriods.add(ps);
      }
    }
    const cumulative = runningTarget > 0 ? (runningTotal / runningTarget) * 100 : 0;
    points.push({
      entryDate: key,
      dailyProgress: dayValue > 0 ? round1((dayValue / target) * 100) : 0,
      dailyProgressRaw: dayValue,
      cumulativeProgress: round1(cumulative),
      cumulativeProgressRaw: runningTotal,
    });
  }

  return points;
}

export interface WeeklyChange {
  thisWeek: number;
  lastWeek: number;
  changePct: number;
  hasChange: boolean;
}

/** This week vs. last week totals and the percentage delta. */
export function computeWeeklyChange(entries: DailyEntry[]): WeeklyChange {
  const base = today();
  const thisWeekStart = startOfWeek(base);
  const lastWeekStart = addDays(thisWeekStart, -7);

  const endOfToday = new Date(base);
  endOfToday.setHours(23, 59, 59, 999);

  const sumRange = (start: Date, end: Date): number =>
    entries.reduce((sum, entry) => {
      const date = parseLocalDate(entry.entryDate);
      return date >= start && date < end ? sum + entry.actualValue : sum;
    }, 0);

  const thisWeek = sumRange(thisWeekStart, endOfToday);
  const lastWeek = sumRange(lastWeekStart, thisWeekStart);

  if (lastWeek === 0) {
    return { thisWeek, lastWeek, changePct: thisWeek > 0 ? 100 : 0, hasChange: thisWeek > 0 };
  }
  return {
    thisWeek,
    lastWeek,
    changePct: ((thisWeek - lastWeek) / lastWeek) * 100,
    hasChange: true,
  };
}

/** Sums `actualValue`, guarding against nullish values. */
export function sumActual(entries: DailyEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.actualValue ?? 0), 0);
}

/** Percent of target achieved; 0 when the target is missing/zero. */
export function dailyProgressPercent(actual: number, target: number): number {
  return target > 0 ? (actual / target) * 100 : 0;
}

/**
 * Sum of `actualValue` for entries that fall in the current week
 * (Monday 00:00 through end of today). Used so goal-list progress matches
 * the Goal Details "this week" figure and resets to 0 on a new week.
 */
export function weeklyTotal(entries: DailyEntry[]): number {
  const weekStart = startOfWeek(today());
  const endOfToday = new Date(today());
  endOfToday.setHours(23, 59, 59, 999);
  return entries.reduce((sum, entry) => {
    const date = parseLocalDate(entry.entryDate);
    return date >= weekStart && date <= endOfToday ? sum + (entry.actualValue ?? 0) : sum;
  }, 0);
}

/** Human-readable label for a goal period, e.g. "week" -> "Week". */
export function periodLabel(period?: string): string {
  if (!period) return '';
  return period.charAt(0).toUpperCase() + period.slice(1).toLowerCase();
}
