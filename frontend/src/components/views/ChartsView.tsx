import React from 'react';
import type { ChartRange, Goal } from '../../types';
import { CHART_RANGE_LABELS, CHART_RANGES } from '../../types';
import { useChartData } from '../../hooks/useChartData';
import ChartView from '../ChartView';
import { ErrorState } from '../ui/StatusStates';
import { getErrorMessage } from '../../lib/http';

interface ChartsViewProps {
  goals: Goal[];
  isDarkMode: boolean;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

const ChartsView: React.FC<ChartsViewProps> = ({ goals, isDarkMode, range, onRangeChange }) => {
  const { data: chartData, isLoading, isFetching, error, refetch } = useChartData(range);

  if (error) {
    return (
      <ErrorState
        message={`Failed to load chart data: ${getErrorMessage(error)}`}
        onRetry={refetch}
      />
    );
  }

  return (
    <div>
      {import.meta.env.DEV && (
        <div className="rounded bg-red-100 p-2 text-xs text-red-900">
          Debug: goals={goals.length}, range={range}, chartData={chartData.length}, loading={isLoading}, fetching={isFetching}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Progress Charts</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Chart range">
          {CHART_RANGES.map((option: ChartRange) => (
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

      <ChartView goals={goals} data={chartData} isDarkMode={isDarkMode} />
    </div>
  );
};

export default ChartsView;
