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

/**
 * Returns the target-history entry whose `validFrom` is the latest one on or
 * before `date`, honouring `validTo` (when set). Returns `null` when no entry
 * applies.
 */
export function effectiveHistoryEntry(
  goal: Goal,
  date: Date
): TargetHistoryEntry | null {
  const history = goal.targetHistory;
  if (!history || history.length === 0) return null;
  let best: TargetHistoryEntry | null = null;
  for (const entry of history) {
    const from = parseLocalDate(entry.validFrom);
    if (from > date) continue;
    const to = entry.validTo ? parseLocalDate(entry.validTo) : null;
    if (to !== null && date > to) continue;
    if (best === null || from > parseLocalDate(best.validFrom)) {
      best = entry;
    }
  }
  return best;
}

/** Period (e.g. "WEEK") of the target-history entry valid at `date`. */
export function effectivePeriod(goal: Goal, date: Date): string {
  return effectiveHistoryEntry(goal, date)?.period ?? 'WEEK';
}

/**
 * Returns the effective target value (period amount) for `goal` at the current
 * date — i.e. the `targetValue` of the latest target-history entry valid today.
 */
export function effectiveGoalTarget(goal: Goal): number {
  return effectiveHistoryEntry(goal, today())?.targetValue ?? 0;
}

/**
 * Returns the effective period (e.g. "WEEK") for `goal` at the current date.
 */
export function effectiveGoalPeriod(goal: Goal): string | undefined {
  return effectiveHistoryEntry(goal, today())?.period;
}

/**
 * Derived week/month/year targets for a goal.
 * Uses the latest target-history entry; falls back to WEEK when none exists.
 */
export function derivePeriodTargets(goal: Goal): PeriodEquivalents {
  const now = effectiveHistoryEntry(goal, today());
  const base = now?.targetValue ?? 0;
  const period = now?.period ?? 'WEEK';
  return derivePeriodEquivalents(base, period);
}

/**
 * The period (e.g. weekly) target valid at `date`, honouring `targetHistory`.
 * Falls back to 0 when no history applies.
 */
export function effectivePeriodTarget(goal: Goal, date: Date): number {
  const entry = effectiveHistoryEntry(goal, date);
  return entry?.targetValue ?? 0;
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

/**
 * The scaled target for a chart range, i.e. the total expected value over the
 * full window. For rolling day ranges (7d/30d/365d) this is the proportional
 * scaling (periodTarget / daysPerPeriod × windowDays). For calendar-aligned
 * ranges it is the sum of whole period targets overlapping the window.
 */
export function windowScaledTarget(goal: Goal, range: ChartRange, entries?: DailyEntry[]): number {
  const now = effectiveHistoryEntry(goal, today());
  const targetVal = now?.targetValue ?? 0;
  const target = targetVal > 0 ? targetVal : 1;
  const period = now?.period ?? 'WEEK';
  const from = rangeStartDate(range);
  const base = today();
  const rangeTo = range === 'week' ? addDays(startOfWeek(base), 6) : base;
  const daysPerPeriod = DAYS_PER_PERIOD[period.toUpperCase()] ?? DAYS_PER_PERIOD.WEEK;

  const rollingDayRange = range === '7d' || range === '30d' || range === '365d';
  if (rollingDayRange && from !== null) {
    let total = 0;
    for (let c = new Date(from); c <= rangeTo; c = addDays(c, 1)) {
      total += (effectivePeriodTarget(goal, c) || target) / daysPerPeriod;
    }
    return total;
  }

  // "all" range: pre-compute the total target from the first entry date to
  // today, matching the denominator used in buildProgressSeries.
  if (from === null) {
    let firstDate: Date;
    if (entries && entries.length > 0) {
      const sorted = [...entries.map((e) => e.entryDate)].sort();
      firstDate = parseLocalDate(sorted[0]);
    } else {
      const history = goal.targetHistory;
      const firstValidFrom = history && history.length > 0
        ? [...history].reduce((earliest, h) => h.validFrom < earliest ? h.validFrom : earliest, history[0].validFrom)
        : toLocalISODate(new Date(base.getFullYear(), 0, 1));
      firstDate = parseLocalDate(firstValidFrom);
    }
    const creditedPeriods = new Set<string>();
    let total = 0;
    for (let c = new Date(firstDate); c <= base; c = addDays(c, 1)) {
      if (isPeriodStart(c, period)) {
        const ps = periodStartForDate(c, period);
        if (!creditedPeriods.has(ps)) {
          total += effectivePeriodTarget(goal, parseLocalDate(ps)) || target;
          creditedPeriods.add(ps);
        }
      }
    }
    return total || target;
  }

  // "year" range: pre-compute the total target for the entire calendar year
  // (not just elapsed periods), so the raw axis reflects the full annual goal.
  if (range === 'year') {
    const yearStart = new Date(base.getFullYear(), 0, 1);
    const yearEnd = new Date(base.getFullYear(), 11, 31);
    let total = 0;
    const creditedPeriods = new Set<string>();
    for (let c = new Date(yearStart); c <= yearEnd; c = addDays(c, 1)) {
      if (isPeriodStart(c, period)) {
        const ps = periodStartForDate(c, period);
        if (!creditedPeriods.has(ps)) {
          total += effectivePeriodTarget(goal, parseLocalDate(ps)) || target;
          creditedPeriods.add(ps);
        }
      }
    }
    return total || target;
  }

  // Calendar-aligned: sum of whole period targets overlapping the window.
  const creditedPeriods2 = new Set<string>();
  let total = 0;
  const firstPs = periodStartForDate(from, period);
  const firstTarget = effectivePeriodTarget(goal, parseLocalDate(firstPs)) || target;
  if (!creditedPeriods2.has(firstPs)) {
    total += firstTarget;
    creditedPeriods2.add(firstPs);
  }
  for (let c = new Date(from); c <= rangeTo; c = addDays(c, 1)) {
    if (isPeriodStart(c, period)) {
      const ps = periodStartForDate(c, period);
      if (!creditedPeriods2.has(ps)) {
        total += effectivePeriodTarget(goal, parseLocalDate(ps)) || target;
        creditedPeriods2.add(ps);
      }
    }
  }
  return total;
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
 *  - "all" plots every day from the first entry date to today (so gaps are visible),
 *    using a fixed denominator (sum of all period targets in range) so cumulative
 *    is monotonically non-decreasing;
 *  - bounded ranges plot every day in the window (so gaps are visible);
 *  - "this week" extends to Sunday so later-in-week entries appear;
 *  - "year" uses a fixed denominator (full calendar-year target) so cumulative
 *    reflects the true proportion of the annual goal achieved;
 *  - the cumulative line never uses a clamp — it is naturally non-decreasing for
 *    fixed-denominator ranges (all/year/7d/30d/365d). The "week" range retains
 *    its original per-period accumulation + clamp behavior.
 */
export function buildProgressSeries(
  entries: DailyEntry[],
  goal: Goal,
  range: ChartRange
): ProgressPoint[] {
  const now = effectiveHistoryEntry(goal, today());
  const targetVal = now?.targetValue ?? 0;
  const target = targetVal > 0 ? targetVal : 1;
  const period = now?.period ?? 'WEEK';

  const valueByDate = new Map<string, number>();
  for (const entry of entries) {
    valueByDate.set(entry.entryDate, (valueByDate.get(entry.entryDate) ?? 0) + entry.actualValue);
  }

  const from = rangeStartDate(range);

  if (from === null) {
    if (valueByDate.size === 0) return [];

    const sortedDates = [...valueByDate.keys()].sort((a, b) => a.localeCompare(b));
    const firstDate = parseLocalDate(sortedDates[0]);
    const baseDate = today();

    // Pre-compute the fixed total target for the entire "all" range (first entry
    // date → today). The denominator sums the effective period target for each
    // unique period-start within the range (historical for past periods,
    // projected current target for future periods). Because the denominator is
    // fixed and `runningTotal` only grows, cumulative progress is monotonically
    // non-decreasing — it never drops on empty days or when a new period starts.
    const allCreditedPeriods = new Set<string>();
    let fixedAllTarget = 0;
    for (let c = new Date(firstDate); c <= baseDate; c = addDays(c, 1)) {
      if (isPeriodStart(c, period)) {
        const ps = periodStartForDate(c, period);
        if (!allCreditedPeriods.has(ps)) {
          fixedAllTarget += effectivePeriodTarget(goal, parseLocalDate(ps)) || target;
          allCreditedPeriods.add(ps);
        }
      }
    }

    let runningTotal = 0;
    const points: ProgressPoint[] = [];
    for (let cursor = new Date(firstDate); cursor <= baseDate; cursor = addDays(cursor, 1)) {
      const key = toLocalISODate(cursor);
      const dayValue = valueByDate.get(key) ?? 0;
      runningTotal += dayValue;
      const cumulative = fixedAllTarget > 0 ? (runningTotal / fixedAllTarget) * 100 : 0;
      // dailyProgress uses the same denominator as cumulativeProgress so it
      // never exceeds cumulative (a single day's value as a share of the
      // fixed target denominator).
      const dailyProg = dayValue > 0 ? round1((dayValue / fixedAllTarget) * 100) : 0;
      points.push({
        entryDate: key,
        dailyProgress: dailyProg,
        dailyProgressRaw: dayValue,
        cumulativeProgress: round1(cumulative),
        cumulativeProgressRaw: runningTotal,
      });
    }
    return points;
  }

  const base = today();
  // For "this week", extend through Sunday to include future days of the week.
  const rangeTo = range === 'week' ? addDays(startOfWeek(base), 6) : base;

  const points: ProgressPoint[] = [];

  // Rolling day-based ranges (7d/30d/365d) measure cumulative progress against
  // the full window's expected target: the denominator is the *total* target for
  // the entire window (proportional to elapsed days), computed once up front.
  // Because the denominator is fixed and `runningTotal` only grows, cumulative
  // progress is monotonically non-decreasing — it never drops on empty days.
  // The target effective at each day is used (honoring target-history changes
  // and `validTo`), so mid-window target changes are correctly reflected.
  // Days before the first history entry fall back to the current target so they
  // still contribute to the denominator.
  const rollingDayRange = range === '7d' || range === '30d' || range === '365d';
  if (rollingDayRange) {
    const daysPerPeriod = DAYS_PER_PERIOD[(period || 'WEEK').toUpperCase()] ?? DAYS_PER_PERIOD.WEEK;
    const fallbackTarget = target;
    // Pre-compute the full-window denominator: sum of daily targets for each day
    // in the window, using the target effective at that day (or the current
    // target as a fallback for days before history begins).
    let windowTarget = 0;
    for (let c = new Date(from); c <= rangeTo; c = addDays(c, 1)) {
      const t = effectivePeriodTarget(goal, c) || fallbackTarget;
      windowTarget += t / daysPerPeriod;
    }

    let runningTotal = 0;
    for (let cursor = new Date(from); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
      const key = toLocalISODate(cursor);
      const dayValue = valueByDate.get(key) ?? 0;
      runningTotal += dayValue;
      const cumulative = windowTarget > 0 ? (runningTotal / windowTarget) * 100 : 0;
      // Daily progress is relative to the full window's proportional denominator,
      // so it is always <= cumulative progress (a single day's value as a share of
      // the total expected target across the window).
      const dailyProg = dayValue > 0 ? round1((dayValue / windowTarget) * 100) : 0;
      points.push({
        entryDate: key,
        dailyProgress: dailyProg,
        dailyProgressRaw: dayValue,
        cumulativeProgress: round1(cumulative),
        cumulativeProgressRaw: runningTotal,
      });
    }
    return points;
  }

  // Calendar-aligned ranges (week) accumulate whole period targets each
  // time a new period starts within the window, so a new week begins at 0% and
  // two full weeks compare actual to the sum of both weeks' targets.
  // The `year` range is handled separately above — it uses a fixed denominator
  // (the total expected target for the entire year) rather than accumulating
  // per-period targets, so cumulative progress reflects the true proportion of
  // the annual goal achieved.

  // Calendar-aligned range (year): fixed denominator = sum of all period
  // targets whose start falls within the calendar year. For periods already
  // in the past, use the historical target; for future periods, project the
  // current (latest) target. Because the denominator is fixed and
  // `runningTotal` only grows, cumulative progress is naturally monotonically
  // non-decreasing — no clamp needed.
  if (range === 'year') {
    const yearStart = new Date(base.getFullYear(), 0, 1);
    const yearEnd = new Date(base.getFullYear(), 11, 31);

    // Pre-compute the fixed year target by iterating every day in the year and
    // summing the target of each unique period-start.
    let fixedYearTarget = 0;
    const creditedPeriods = new Set<string>();
    for (let c = new Date(yearStart); c <= yearEnd; c = addDays(c, 1)) {
      if (isPeriodStart(c, period)) {
        const ps = periodStartForDate(c, period);
        if (!creditedPeriods.has(ps)) {
          fixedYearTarget += effectivePeriodTarget(goal, parseLocalDate(ps)) || target;
          creditedPeriods.add(ps);
        }
      }
    }

    let runningTotal = 0;
    for (let cursor = new Date(from); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
      const key = toLocalISODate(cursor);
      const dayValue = valueByDate.get(key) ?? 0;
      runningTotal += dayValue;
      const cumulative = fixedYearTarget > 0 ? (runningTotal / fixedYearTarget) * 100 : 0;
      // dailyProgress uses the same denominator as cumulativeProgress (fixedYearTarget)
      // so it never exceeds cumulative.
      const dailyProg = dayValue > 0 ? round1((dayValue / fixedYearTarget) * 100) : 0;
      points.push({
        entryDate: key,
        dailyProgress: dailyProg,
        dailyProgressRaw: dayValue,
        cumulativeProgress: round1(cumulative),
        cumulativeProgressRaw: runningTotal,
      });
    }
    return points;
  }

  // Calendar-aligned ranges (week)
  let runningTotal = 0;
  let runningTarget = 0;
  let prevCumulative = 0;
  const creditedPeriods = new Set<string>();

  const firstPs = periodStartForDate(from, period);
  if (!creditedPeriods.has(firstPs)) {
    runningTarget += effectivePeriodTarget(goal, parseLocalDate(firstPs)) || target;
    creditedPeriods.add(firstPs);
  }

  for (let cursor = new Date(from); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
    const key = toLocalISODate(cursor);
    const dayValue = valueByDate.get(key) ?? 0;
    runningTotal += dayValue;
    if (isPeriodStart(cursor, period)) {
      const ps = periodStartForDate(cursor, period);
      if (!creditedPeriods.has(ps)) {
        runningTarget += effectivePeriodTarget(goal, parseLocalDate(ps)) || target;
        creditedPeriods.add(ps);
      }
    }
    const cumulative = runningTarget > 0 ? (runningTotal / runningTarget) * 100 : 0;
    const dayTarget = effectivePeriodTarget(goal, cursor) || target;
    const dayPortion = dayTarget / (DAYS_PER_PERIOD[period.toUpperCase()] || DAYS_PER_PERIOD.WEEK);
    const dailyProg = dayValue > 0 ? round1((dayValue / dayPortion) * 100) : 0;
    prevCumulative = Math.max(cumulative, prevCumulative);
    points.push({
      entryDate: key,
      dailyProgress: dayValue > 0 ? Math.min(dailyProg, round1(prevCumulative)) : 0,
      dailyProgressRaw: dayValue,
      cumulativeProgress: round1(prevCumulative),
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
