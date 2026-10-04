import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProgressSeries } from './goalMath';
import type { DailyEntry, Goal } from '../types';

const TODAY = new Date(2026, 7, 30);

describe('ChartView data flow simulation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('week range with entries produces non-empty chartData', async () => {
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

    const goal: Goal = {
      id: 1,
      name: 'Read',
      unit: 'min',
      active: true,
      targetHistory: [{ id: 1, goalId: 1, validFrom: '2026-08-01', targetValue: 60, period: 'WEEK' }],
    };
    const entries: DailyEntry[] = [
      { id: 1, goalId: 1, entryDate: '2026-08-30', actualValue: 30, targetValue: 60 },
    ];

    const points = fn(entries, goal, 'week');
    console.log('week points length:', points.length);
    expect(points.length).toBe(7);
  });
});
