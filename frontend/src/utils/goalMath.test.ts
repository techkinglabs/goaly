import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProgressSeries, periodStartForDate } from './goalMath';
import type { DailyEntry, Goal } from '../types';

const round1 = (value: number) => Math.round(value * 10) / 10;

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 1,
  name: 'Read',
  unit: 'min',
  targetValue: 60,
  isActive: true,
  period: 'WEEK',
  ...overrides,
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
    const goal = makeGoal({ targetValue: 60, amountPerPeriod: 60, period: 'WEEK' });
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
    const goal = makeGoal({ targetValue: 60, amountPerPeriod: 60, period: 'WEEK' });
    // Entry on Tuesday (the first day of the window, in the prior calendar week).
    const entries = [entry('2026-08-25', 16)];

    const points = fn(entries, goal, '7d');

    expect(points.length).toBe(7);
    // The Tuesday entry is day 0 of the window: it is credited immediately
    // (no longer 0 until the final day).
    expect(points[0].cumulativeProgress).toBeGreaterThan(0);
    expect(points[0].dailyProgress).toBeGreaterThan(0);
    // Remaining empty days keep the same cumulative value (continuous line).
    for (let i = 1; i <= 6; i++) expect(points[i].cumulativeProgress).toBe(points[0].cumulativeProgress);
    // 7 days = one elapsed week => denominator 60, so 16/60 = 26.7%.
    expect(points[6].cumulativeProgress).toBe(round1((16 / 60) * 100)); // 26.7 -> 27.0
  });
});
