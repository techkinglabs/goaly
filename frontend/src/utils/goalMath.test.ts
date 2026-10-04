import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProgressSeries, effectiveHistoryEntry, periodStartForDate, windowScaledTarget } from './goalMath';
import type { DailyEntry, Goal, TargetHistoryEntry } from '../types';

const round1 = (value: number) => Math.round(value * 10) / 10;

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 1,
  name: 'Read',
  unit: 'min',
  active: true,
  ...overrides,
});

const makeHistory = (from: string, targetValue: number, period: TargetHistoryEntry['period'] = 'WEEK'): TargetHistoryEntry => ({
  id: 1,
  goalId: 1,
  validFrom: from,
  targetValue,
  period,
});

const entry = (entryDate: string, actualValue: number): DailyEntry => ({
  id: 1,
  goalId: 1,
  entryDate,
  actualValue,
  targetValue: 60,
});

// Pin "today" to Sunday 2026-08-30 so a 7d window is Mon 2026-08-24 .. Sun 2026-08-30
// (one full week = one period target of 60).
const TODAY = new Date(2026, 7, 30);

describe('periodStartForDate', () => {
  it('returns Monday for a WEEK period', () => {
    expect(periodStartForDate(new Date(2026, 7, 25), 'WEEK')).toBe('2026-08-24');
  });
  it('returns day 1 of month for MONTH', () => {
    expect(periodStartForDate(new Date(2026, 7, 15), 'MONTH')).toBe('2026-08-01');
  });
  it('returns Jan 1 for YEAR', () => {
    expect(periodStartForDate(new Date(2026, 7, 15), 'YEAR')).toBe('2026-01-01');
  });
});

describe('buildProgressSeries 7d', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('is continuous, 0 before the entry, and reaches ~27% on the entry day', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(TODAY);
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // Single entry on the last day of the window (Sunday).
    const entries = [entry('2026-08-30', 16)];

    const points = fn(entries, goal, '7d');

    expect(points.length).toBe(7);

    // Every day before the entry is 0 cumulative.
    for (let i = 0; i < 6; i++) {
      expect(points[i].cumulativeProgress).toBe(0);
    }

    const entryPoint = points[6];
    expect(entryPoint.dailyProgress).toBeGreaterThan(0);
    expect(entryPoint.cumulativeProgress).toBe(round1((16 / 60) * 100)); // 26.7 -> 27.0
    expect(entryPoint.cumulativeProgress).toBeGreaterThan(0);
  });

  it('7d window counts exactly one period target even when it straddles two calendar weeks', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(2026, 7, 31); // Monday — window is Tue 25 .. Mon 31
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // Entry on Tuesday (the first day of the window, in the prior calendar week).
    const entries = [entry('2026-08-25', 16)];

    const points = fn(entries, goal, '7d');

    expect(points.length).toBe(7);
    // The Tuesday entry is day 0 of the window: it is credited immediately.
    expect(points[0].cumulativeProgress).toBeGreaterThan(0);
    expect(points[0].dailyProgress).toBeGreaterThan(0);
    // After a full 7-day window, the denominator equals one week's target (60).
    // 16/60 = 26.7%. The line is non-decreasing (fixed denominator).
    expect(points[6].cumulativeProgress).toBe(round1((16 / 60) * 100));
    // The cumulative line never decreases.
    for (let i = 1; i < 7; i++) {
      expect(points[i].cumulativeProgress).toBeGreaterThanOrEqual(points[i - 1].cumulativeProgress);
    }
  });
});

function mockDate(date: Date) {
  vi.doMock('../utils/date', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/date')>();
    return {
      ...actual,
      today: () => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      },
    };
  });
}

describe('buildProgressSeries 30d', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('scales denominator proportionally to elapsed days', async () => {
    // Today = 2026-08-30 (Sunday). 30d window = 2026-08-01 .. 2026-08-30.
    await mockDate(TODAY);

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // Single entry on the last day of the window (Sunday).
    const entries = [entry('2026-08-30', 60)];

    const points = fn(entries, goal, '30d');

    // Window: 30 days (Aug 1 .. Aug 30), so 30 points.
    expect(points.length).toBe(30);

    // Each day adds 60/7 to the window target; after 30 days windowTarget = 60/7*30 ≈ 257.
    const expected = round1((60 / (60 / 7 * 30)) * 100);
    expect(points[29].cumulativeProgress).toBe(expected); // ~23.3
    // The cumulative line never decreases.
    for (let i = 1; i < 30; i++) {
      expect(points[i].cumulativeProgress).toBeGreaterThanOrEqual(points[i - 1].cumulativeProgress);
    }
  });

  it('accumulates both targets when target changes mid-window', async () => {
    // Today = 2026-08-30 (Sunday). 30d window = 2026-08-01 .. 2026-08-30.
    await mockDate(TODAY);

    const { buildProgressSeries: fn } = await import('./goalMath');
    const history: TargetHistoryEntry[] = [
      { id: 1, goalId: 1, validFrom: '2026-08-01', validTo: '2026-08-14', targetValue: 60, period: 'WEEK' },
      { id: 2, goalId: 1, validFrom: '2026-08-15', targetValue: 140, period: 'WEEK' },
    ];
    const goal = makeGoal({ targetHistory: history });
    // 60 units on Aug 1 + 140 units on Aug 15 = 200 total.
    const entries = [entry('2026-08-01', 60), entry('2026-08-15', 140)];

    const points = fn(entries, goal, '30d');

    // Days Aug 1-14 (14 days): 60/7 per day → 14 * 60/7 = 120
    // Days Aug 15-30 (16 days): 140/7 per day → 16 * 140/7 = 320
    // windowTarget = 440
    const expected = round1((200 / 440) * 100);
    expect(points[29].cumulativeProgress).toBe(expected); // ~45.5
  });

  it('falls back to current target for days before history starts', async () => {
    // Today = 2026-08-30 (Sunday). 30d window = 2026-08-01 .. 2026-08-30.
    await mockDate(TODAY);

    const { buildProgressSeries: fn } = await import('./goalMath');
    // Goal created on Aug 25 — 5 days into the window. Days before that have no
    // valid history entry, so they must fall back to the current target (60).
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-25', 60, 'WEEK')] });
    const entries = [entry('2026-08-30', 10)];

    const points = fn(entries, goal, '30d');

    // All 30 days contribute 60/7 to the denominator (25 days via fallback,
    // 5 days via history). windowTarget = 30 * 60/7 ≈ 257.
    const expected = round1((10 / (30 * 60 / 7)) * 100);
    expect(points[29].cumulativeProgress).toBe(expected); // ~3.9, not 116
    expect(points[29].cumulativeProgress).toBeLessThan(10);
  });

  it('dailyProgress is relative to the window denominator, never exceeding cumulative', async () => {
    // Today = 2026-08-30 (Sunday). 30d window = 2026-08-01 .. 2026-08-30.
    await mockDate(TODAY);

    const { buildProgressSeries: fn } = await import('./goalMath');
    const history: TargetHistoryEntry[] = [
      { id: 1, goalId: 1, validFrom: '2026-08-01', validTo: '2026-08-14', targetValue: 60, period: 'WEEK' },
      { id: 2, goalId: 1, validFrom: '2026-08-15', targetValue: 140, period: 'WEEK' },
    ];
    const goal = makeGoal({ targetHistory: history });
    // 60 units on Aug 1 + 140 units on Aug 15 = 200 total.
    const entries = [entry('2026-08-01', 60), entry('2026-08-15', 140)];

    const points = fn(entries, goal, '30d');

    // windowTarget = 14*(60/7) + 16*(140/7) = 120 + 320 = 440
    // Aug 1: dailyProgress = 60/440 * 100 ≈ 13.6%
    const aug1 = points.find((p) => p.entryDate === '2026-08-01');
    expect(aug1?.dailyProgress).toBe(round1((60 / 440) * 100));

    // Aug 15: dailyProgress = 140/440 * 100 ≈ 31.8%
    const aug15 = points.find((p) => p.entryDate === '2026-08-15');
    expect(aug15?.dailyProgress).toBe(round1((140 / 440) * 100));

    // Daily progress for a day with an entry never exceeds cumulative progress.
    expect(aug1?.dailyProgress).toBeLessThanOrEqual(aug1?.cumulativeProgress ?? 0);
    expect(aug15?.dailyProgress).toBeLessThanOrEqual(aug15?.cumulativeProgress ?? 0);
  });
});

describe('effectiveHistoryEntry', () => {
  it('returns null when no history exists', () => {
    expect(effectiveHistoryEntry(makeGoal(), new Date(2026, 7, 30))).toBeNull();
  });

  it('honors validTo and skips expired entries', () => {
    const history: TargetHistoryEntry[] = [
      { id: 1, goalId: 1, validFrom: '2026-07-01', validTo: '2026-07-31', targetValue: 60, period: 'WEEK' },
      { id: 2, goalId: 1, validFrom: '2026-08-01', targetValue: 100, period: 'WEEK' },
    ];
    const goal = makeGoal({ targetHistory: history });

    // Before validTo of entry 1 → entry 1
    expect(effectiveHistoryEntry(goal, new Date(2026, 6, 15))?.targetValue).toBe(60);
    // On validTo date (inclusive) → entry 1 still valid
    expect(effectiveHistoryEntry(goal, new Date(2026, 6, 31))?.targetValue).toBe(60);
    // After validTo → entry 2 (which has no validTo)
    expect(effectiveHistoryEntry(goal, new Date(2026, 7, 15))?.targetValue).toBe(100);
  });

  it('returns the latest entry valid on the same date', () => {
    const history: TargetHistoryEntry[] = [
      { id: 1, goalId: 1, validFrom: '2026-08-01', targetValue: 60, period: 'WEEK' },
      { id: 2, goalId: 1, validFrom: '2026-08-15', targetValue: 140, period: 'WEEK' },
    ];
    const goal = makeGoal({ targetHistory: history });

    expect(effectiveHistoryEntry(goal, new Date(2026, 7, 10))?.targetValue).toBe(60);
    expect(effectiveHistoryEntry(goal, new Date(2026, 7, 20))?.targetValue).toBe(140);
    // On the exact validFrom of entry 2 → entry 2
    expect(effectiveHistoryEntry(goal, new Date(2026, 7, 15))?.targetValue).toBe(140);
  });
});

describe('windowScaledTarget', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the period target for the week range (no history gap)', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 34, 'WEEK')] });
    // This week starts Aug 24 (Mon). Window = Aug 24..Aug 30 (7 days, 1 week).
    expect(fn(goal, 'week')).toBeCloseTo(34);
  });

  it('falls back to current target for days before history starts', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    // Goal created Aug 25 — window starts Aug 24 (before history).
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-25', 60, 'WEEK')] });
    // firstPs (Aug 24) has no valid history → fallback to target (60).
    expect(fn(goal, 'week')).toBeCloseTo(60);
  });

  it('returns proportional target for 30d range', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // 30 days × 60/7 = 257.14
    expect(fn(goal, '30d')).toBeCloseTo(60 / 7 * 30);
  });

  it('returns 1 when no targetHistory exists', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    const goal = makeGoal();
    // No history → target = 1 (fallback), windowTarget = 30 * 1/7 = 4.29
    expect(fn(goal, '30d')).toBeCloseTo(30 / 7);
  });

  it('returns full annual target for year range', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-01-01', 700, 'WEEK')] });
    // Year 2026 has 52 Mondays (period starts for WEEK).
    // fixedYearTarget = 52 × 700 = 36,400.
    expect(fn(goal, 'year')).toBe(52 * 700);
  });

  it('returns annual target for all range (no entries passed)', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-01-01', 60, 'WEEK')] });
    // "all" with no entries uses the first history validFrom (Jan 1) to today.
    // Mondays from Jan 1 to Aug 30 = 34 → 34 × 60 = 2040.
    expect(fn(goal, 'all')).toBe(34 * 60);
  });

  it('returns all-range target matching first entry date', async () => {
    await mockDate(TODAY);
    const { windowScaledTarget: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-01-01', 60, 'WEEK')] });
    // Entries starting Aug 24 → only 1 Monday (Aug 24) in range Aug 24..Aug 30.
    const entries = [entry('2026-08-24', 60)];
    expect(fn(goal, 'all', entries)).toBe(1 * 60);
  });
});

describe('buildProgressSeries all', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('cumulative progress matches the unclamped runningTotal / runningTarget ratio', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(TODAY);
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // Entries within the "all" range (Aug 24 .. Aug 30, today=Sun Aug 30).
    const entries = [entry('2026-08-24', 40), entry('2026-08-26', 20)];

    const points = fn(entries, goal, 'all');

    // Aug 24 is a Monday (period start): runningTarget = 60 (the weekly target).
    // After Aug 24 entry: runningTotal = 40 → cumulative = 40/60 * 100 ≈ 66.7%.
    const aug24 = points.find((p) => p.entryDate === '2026-08-24');
    expect(aug24?.cumulativeProgress).toBe(round1((40 / 60) * 100));

    // After Aug 26 entry: runningTotal = 60 → cumulative = 60/60 * 100 = 100%.
    const aug26 = points.find((p) => p.entryDate === '2026-08-26');
    expect(aug26?.cumulativeProgress).toBe(round1((60 / 60) * 100));

    // Days with no entry retain the same cumulative as the previous non-zero day.
    const aug25 = points.find((p) => p.entryDate === '2026-08-25');
    expect(aug25?.cumulativeProgress).toBe(aug24?.cumulativeProgress);
  });

  it('daily progress uses the same denominator as cumulativeProgress (all range)', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(TODAY);
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // 80 on Aug 24: runningTarget = 60, so both daily and cumulative = 80/60*100 ≈ 133.3%.
    const entries = [entry('2026-08-24', 80)];

    const points = fn(entries, goal, 'all');

    const aug24 = points.find((p) => p.entryDate === '2026-08-24');
    expect(aug24?.cumulativeProgress).toBe(round1((80 / 60) * 100));
    // dailyProgress uses the same denominator (runningTarget), not dayPortion.
    expect(aug24?.dailyProgress).toBe(round1((80 / 60) * 100));
    expect(aug24?.dailyProgress).toBe(aug24?.cumulativeProgress);
  });

  it('plots all days from first entry to today (not just dates with entries)', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(TODAY);
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // Single entry on Aug 24 — but "all" should plot Aug 24 through Aug 30 (today).
    const entries = [entry('2026-08-24', 60)];

    const points = fn(entries, goal, 'all');

    // Should cover every day from Aug 24 to Aug 30 = 7 days.
    expect(points.length).toBe(7);
    expect(points[0].entryDate).toBe('2026-08-24');
    expect(points[6].entryDate).toBe('2026-08-30');
    // Days without entries show 0 raw value.
    expect(points[1].dailyProgressRaw).toBe(0);
    expect(points[1].cumulativeProgress).toBe(points[0].cumulativeProgress);
  });

  it('cumulative does not go down when a new period starts (all range)', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(TODAY); // Aug 30, 2026
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const goal = makeGoal({ targetHistory: [makeHistory('2026-08-01', 60, 'WEEK')] });
    // 60 on Aug 3 (Monday = first period start). Aug 3, 10, 17, 24 are Mondays
    // within the all range (Aug 3 – Aug 30). fixedAllTarget = 4 × 60 = 240.
    const entries = [entry('2026-08-03', 60)];

    const points = fn(entries, goal, 'all');

    // fixedAllTarget = 4 × 60 = 240 (Aug 3, 10, 17, 24 Mondays).
    const fixedAllTarget = 4 * 60;
    const aug3 = points.find((p) => p.entryDate === '2026-08-03');
    expect(aug3?.cumulativeProgress).toBe(round1((60 / fixedAllTarget) * 100));

    // On Aug 10 (next period start, no entry): runningTotal still 60, denominator still 240.
    // cumulative stays the same — it does NOT jump to 60/60 = 100%.
    const aug10 = points.find((p) => p.entryDate === '2026-08-10');
    expect(aug10?.cumulativeProgress).toBe(aug3?.cumulativeProgress);

    // cumulative is non-decreasing across the entire range.
    for (let i = 1; i < points.length; i++) {
      expect(points[i].cumulativeProgress).toBeGreaterThanOrEqual(points[i - 1].cumulativeProgress);
    }
  });
});

describe('buildProgressSeries year', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses a fixed year denominator: large entry in first week is not stuck at hundreds of percent', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(2026, 7, 30); // Aug 30, 2026 (a Sunday)
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    // Annual goal split into weekly periods of 700 (52 weeks × 700 = 36,400).
    const goal = makeGoal({ targetHistory: [makeHistory('2026-01-01', 700, 'WEEK')] });
    // 5000 in the first week (on the first Monday = 2026-01-05).
    const entries = [entry('2026-01-05', 5000)];

    const points = fn(entries, goal, 'year');

    // fixedYearTarget = 52 × 700 = 36,400
    const fixedYearTarget = 52 * 700;
    const expected = round1((5000 / fixedYearTarget) * 100);

    const jan5 = points.find((p) => p.entryDate === '2026-01-05');
    expect(jan5?.cumulativeProgress).toBe(expected); // ~13.7, not 714+

    // Days before the entry are 0%.
    const jan1 = points.find((p) => p.entryDate === '2026-01-01');
    expect(jan1?.cumulativeProgress).toBe(0);

    // Days after the entry (no further entries) retain the same cumulative.
    const aug30 = points.find((p) => p.entryDate === '2026-08-30');
    expect(aug30?.cumulativeProgress).toBe(expected);
  });

  it('fixedYearTarget correctly sums historical + projected targets when target changes mid-year', async () => {
    vi.doMock('../utils/date', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../utils/date')>();
      return {
        ...actual,
        today: () => {
          const d = new Date(2026, 7, 30); // Aug 30, 2026
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    // Target 700/week until Jun 30, then 1400/week from Jul 1.
    const history: TargetHistoryEntry[] = [
      { id: 1, goalId: 1, validFrom: '2026-01-01', validTo: '2026-06-30', targetValue: 700, period: 'WEEK' },
      { id: 2, goalId: 1, validFrom: '2026-07-01', targetValue: 1400, period: 'WEEK' },
    ];
    const goal = makeGoal({ targetHistory: history });
    // 5000 in the first week.
    const entries = [entry('2026-01-05', 5000)];

    const points = fn(entries, goal, 'year');

    // Count Mondays (period starts) in 2026 for each target half.
    // First half (Jan 1 – Jun 30): Mondays on Jan 5 .. Jun 29 = 26 weeks.
    // Second half (Jul 1 – Dec 31): Mondays on Jul 6 .. Dec 28 = 26 weeks.
    // fixedYearTarget = 26 × 700 + 26 × 1400 = 18,200 + 36,400 = 54,600
    const fixedYearTarget = 26 * 700 + 26 * 1400;
    const expected = round1((5000 / fixedYearTarget) * 100);

    const jan5 = points.find((p) => p.entryDate === '2026-01-05');
    expect(jan5?.cumulativeProgress).toBe(expected);
    expect(jan5?.cumulativeProgress).toBeLessThan(15); // ~9.2%, not hundreds
  });
});
