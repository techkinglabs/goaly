import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProgressSeries } from './goalMath';
import type { DailyEntry, Goal } from '../types';

const goal: Goal = {
  id: 1,
  name: 'Read',
  unit: 'pages',
  active: true,
  targetHistory: [{
    id: 1,
    goalId: 1,
    validFrom: '2026-10-05',
    validTo: null,
    targetValue: 60,
    period: 'WEEK'
  }],
};

const entries: DailyEntry[] = [
  { id: 1, goalId: 1, entryDate: '2026-10-05', actualValue: 30, targetValue: 60, note: 'Test entry' },
];

describe('Simulate chart tab data flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('week range returns non-empty points', async () => {
    vi.doMock('../utils/date', async () => {
      const actual = await vi.importActual<typeof import('../utils/date')>('../utils/date');
      return {
        ...actual,
        today: () => {
          const d = new Date('2026-10-05T00:00:00');
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const points = fn(entries, goal, 'week');
    console.log('points:', JSON.stringify(points, null, 2));
    expect(points.length).toBe(7);
    expect(points[0].entryDate).toBe('2026-10-05');
  });

  it('all range returns non-empty points', async () => {
    vi.doMock('../utils/date', async () => {
      const actual = await vi.importActual<typeof import('../utils/date')>('../utils/date');
      return {
        ...actual,
        today: () => {
          const d = new Date('2026-10-05T00:00:00');
          d.setHours(0, 0, 0, 0);
          return d;
        },
      };
    });

    const { buildProgressSeries: fn } = await import('./goalMath');
    const points = fn(entries, goal, 'all');
    console.log('all points:', JSON.stringify(points, null, 2));
    expect(points.length).toBeGreaterThan(0);
  });
});
