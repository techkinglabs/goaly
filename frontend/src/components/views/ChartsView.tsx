import React, { useMemo } from 'react';
import type { ChartRange, DailyEntry, Goal } from '../../types';
import { CHART_RANGE_LABELS, CHART_RANGES } from '../../types';
import { buildProgressSeries } from '../../utils/goalMath';
import ChartView from '../ChartView';

interface ChartsViewProps {
  goals: Goal[];
  entries: DailyEntry[];
  isDarkMode: boolean;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

const ChartsView: React.FC<ChartsViewProps> = ({ goals, entries, isDarkMode, range, onRangeChange }) => {
  // Build a per-goal progress series the same way GoalDetails does (client-side
  // via goalMath.buildProgressSeries), so the chart-tab calculations match the
  // per-goal detail chart exactly.
  const seriesByGoalId = useMemo(
    () =>
      new Map(
        goals.map((goal) => [
          goal.id,
          buildProgressSeries(
            entries.filter((entry) => entry.goalId === goal.id),
            goal,
            range
          ),
        ])
      ),
    [goals, entries, range]
  );

  console.debug('[ChartsView] goals:', goals.length, 'entries:', entries.length, 'range:', range, 'seriesByGoalId:', Array.from(seriesByGoalId.entries()).map(([k, v]) => [k, v.length]));

  return (
    <div>
      {import.meta.env.DEV && (
        <div className="rounded bg-red-100 p-2 text-xs text-red-900">
          Debug: goals={goals.length}, entries={entries.length}, range={range}, goalIds={goals.map(g => g.id).join(',')}, entryGoalIds={entries.map(e => e.goalId).join(',')}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Progress Charts</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Chart range">
          {CHART_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRangeChange(option)}
              aria-pressed={range === option}
              className={range === option ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              {CHART_RANGE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <ChartView goals={goals} seriesByGoalId={seriesByGoalId} isDarkMode={isDarkMode} />
    </div>
  );
};

export default ChartsView;
