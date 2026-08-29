import React, { useMemo } from 'react';
import type { DailyEntry, Goal } from '../../types';
import {
  computeWeeklyChange,
  derivePeriodTargets,
  progressPercent,
  sumActual,
} from '../../utils/goalMath';

interface GoalStatsProps {
  goal: Goal;
  entries: DailyEntry[];
}

/** Header + summary tiles for a goal. */
const GoalStats: React.FC<GoalStatsProps> = ({ goal, entries }) => {
  const totalActual = useMemo(() => sumActual(entries), [entries]);
  const weeklyChange = useMemo(() => computeWeeklyChange(entries), [entries]);
  const derived = useMemo(() => derivePeriodTargets(goal), [goal]);

  const percentage = progressPercent(totalActual, goal.targetValue);
  const targetHit = goal.targetValue > 0 && totalActual >= goal.targetValue;

  return (
    <div className="pane-detail mb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${goal.isActive ? 'bg-green-500' : 'bg-red-500'}`}
            title={goal.isActive ? 'Active' : 'Inactive'}
            aria-label={goal.isActive ? 'Active' : 'Inactive'}
          />
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{goal.name}</h2>
        </div>
        <p className="mt-1 text-[var(--text-secondary)]">{goal.description || 'No description'}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="stat-tile">
          <p className="text-sm text-[var(--text-muted)]">Progress</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            {percentage.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Calculated from weekly target ({derived.week.toFixed(1)} {goal.unit}/wk)
          </p>
        </div>
        <div className="stat-tile">
          <p className="text-sm text-[var(--text-muted)]">Delivered Target</p>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            {totalActual.toFixed(1)} / {goal.targetValue} {goal.unit}
          </p>
          <p
            className={`mt-1 text-xs ${
              targetHit ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'
            }`}
          >
            {percentage.toFixed(1)}% of target{' '}
            {targetHit ? '— Target reached ✅' : '— Not reached yet'}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="stat-tile mb-0">
          <p className="mb-2 text-sm text-[var(--text-muted)]">Weekly Change</p>
          <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--text-muted)]">This Week</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {weeklyChange.thisWeek.toFixed(1)} {goal.unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Last Week</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {weeklyChange.lastWeek.toFixed(1)} {goal.unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Change</p>
              {weeklyChange.hasChange ? (
                <p
                  className={`text-lg font-semibold ${
                    weeklyChange.changePct >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {weeklyChange.changePct >= 0 ? '+' : ''}
                  {weeklyChange.changePct.toFixed(1)}%
                  <span className="text-xs font-normal">
                    {' '}
                    ({weeklyChange.changePct >= 0 ? 'more' : 'less'} than last week)
                  </span>
                </p>
              ) : (
                <p className="text-lg font-semibold text-[var(--text-primary)]">—</p>
              )}
            </div>
          </div>
        </div>

        <div className="stat-tile mb-0">
          <p className="mb-2 text-sm text-[var(--text-muted)]">Derived Targets</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {(['week', 'month', 'year'] as const).map((period) => (
              <div key={period}>
                <p className="text-xs capitalize text-[var(--text-muted)]">Per {period}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {derived[period].toFixed(1)} {goal.unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GoalStats);
