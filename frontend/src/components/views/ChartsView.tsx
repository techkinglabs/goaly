import React from 'react';
import type { ChartRange, Goal } from '../../types';
import { CHART_RANGE_LABELS, CHART_RANGES } from '../../types';
import { useChartData } from '../../hooks/useChartData';
import ChartView from '../ChartView';
import { ErrorState, LoadingState } from '../ui/StatusStates';
import { getErrorMessage } from '../../lib/http';

interface ChartsViewProps {
  goals: Goal[];
  isDarkMode: boolean;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

const ChartsView: React.FC<ChartsViewProps> = ({
  goals,
  isDarkMode,
  range,
  onRangeChange,
}) => {
  // Range changes are cached by React Query; no manual refetch plumbing.
  const { rows, isLoading, error, refetch } = useChartData(range);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Progress Charts</h2>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chart range">
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

      {error ? (
        <ErrorState
          message={`Failed to load chart data: ${getErrorMessage(error)}`}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <LoadingState message="Loading chart data…" />
      ) : (
        <ChartView rows={rows} isDarkMode={isDarkMode} goals={goals} />
      )}
    </div>
  );
};

export default ChartsView;
