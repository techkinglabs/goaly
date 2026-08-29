/**
 * Pure goal math — no React, no I/O, so it is trivially unit-testable.
 */
import type { ChartRange, Goal, DailyEntry } from '../types';
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
  progress: number;
  progressRaw: number;
  totalProgress: number;
  totalRaw: number;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Builds the cumulative progress series for one goal.
 *
 * Behaviour preserved from the original implementation:
 *  - "all" plots only dates that actually have entries;
 *  - bounded ranges plot every day in the window (so gaps are visible);
 *  - "this week" extends to Sunday so later-in-week entries appear;
 *  - entries before the window seed the running total.
 */
export function buildProgressSeries(
  entries: DailyEntry[],
  goal: Goal,
  range: ChartRange
): ProgressPoint[] {
  const target = goal.targetValue > 0 ? goal.targetValue : 1;

  const valueByDate = new Map<string, number>();
  for (const entry of entries) {
    valueByDate.set(entry.entryDate, (valueByDate.get(entry.entryDate) ?? 0) + entry.actualValue);
  }

  const from = rangeStartDate(range);

  if (from === null) {
    const sortedDates = [...valueByDate.keys()].sort((a, b) => a.localeCompare(b));
    let runningTotal = 0;
    return sortedDates.map((date) => {
      const dayValue = valueByDate.get(date) ?? 0;
      runningTotal += dayValue;
      return {
        entryDate: date,
        progress: round1((dayValue / target) * 100),
        progressRaw: dayValue,
        totalProgress: round1((runningTotal / target) * 100),
        totalRaw: runningTotal,
      };
    });
  }

  const base = today();
  // For "this week", extend through Sunday to include future days of the week.
  const rangeTo = range === 'week' ? addDays(startOfWeek(base), 6) : base;

  let runningTotal = entries
    .filter((entry) => parseLocalDate(entry.entryDate) < from)
    .reduce((sum, entry) => sum + entry.actualValue, 0);

  const points: ProgressPoint[] = [];
  for (let cursor = new Date(from); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
    const key = toLocalISODate(cursor);
    const dayValue = valueByDate.get(key) ?? 0;
    runningTotal += dayValue;
    points.push({
      entryDate: key,
      progress: dayValue > 0 ? round1((dayValue / target) * 100) : 0,
      progressRaw: dayValue,
      totalProgress: round1((runningTotal / target) * 100),
      totalRaw: runningTotal,
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
export function progressPercent(actual: number, target: number): number {
  return target > 0 ? (actual / target) * 100 : 0;
}
