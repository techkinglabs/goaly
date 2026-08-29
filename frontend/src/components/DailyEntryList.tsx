import React, { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import type { DailyEntry, Goal } from '../types';
import { formatDate } from '../utils/date';
import EmptyState from './ui/EmptyState';

interface DailyEntryListProps {
  entries: DailyEntry[];
  goals: Goal[];
  onEdit?: (entry: DailyEntry) => void;
  onDelete?: (id: number) => void;
  deletingEntryId?: number | null;
}

type SortKey = 'goal' | 'entryDate' | 'actualValue' | 'targetValue' | 'progress';

interface EntryRowProps {
  entry: DailyEntry;
  goalName: string;
  progress: number;
  isDeleting: boolean;
  onEdit?: (entry: DailyEntry) => void;
  onDelete?: (id: number) => void;
}

const EntryRow = React.memo<EntryRowProps>(
  ({ entry, goalName, progress, isDeleting, onEdit, onDelete }) => {
    const handleEdit = useCallback(() => onEdit?.(entry), [onEdit, entry]);
    const handleDelete = useCallback(() => onDelete?.(entry.id), [onDelete, entry.id]);

    return (
      <tr className={isDeleting ? 'opacity-50' : undefined}>
        <td className="whitespace-nowrap">{goalName}</td>
        <td className="whitespace-nowrap">{formatDate(entry.entryDate)}</td>
        <td className="whitespace-nowrap">{entry.actualValue}</td>
        <td className="whitespace-nowrap">{entry.targetValue}</td>
        <td className="whitespace-nowrap">
          <div className="flex items-center">
            <div
              className="progress-track mr-2 h-2.5 w-24"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-2.5 rounded-full bg-blue-600"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </td>
        <td className="whitespace-nowrap text-sm font-medium">
          {onEdit ? (
            <button
              type="button"
              onClick={handleEdit}
              aria-label={`Edit entry for ${goalName}`}
              title="Edit"
              className="btn-icon mr-3 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Pencil size={18} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={`Delete entry for ${goalName}`}
              title="Delete"
              className="btn-icon text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 size={18} />
            </button>
          ) : null}
        </td>
      </tr>
    );
  }
);

EntryRow.displayName = 'EntryRow';

const DailyEntryList: React.FC<DailyEntryListProps> = ({
  entries,
  goals,
  onEdit,
  onDelete,
  deletingEntryId = null,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('entryDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [goalFilter, setGoalFilter] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const goalNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const goal of goals) map.set(goal.id, goal.name);
    return map;
  }, [goals]);

  const getGoalName = useCallback(
    (goalId: number) => goalNameMap.get(goalId) ?? 'Unknown Goal',
    [goalNameMap]
  );

  const filteredSorted = useMemo(() => {
    let result = entries;

    if (goalFilter != null) result = result.filter((entry) => entry.goalId === goalFilter);
    // `YYYY-MM-DD` strings compare chronologically, so no Date parsing needed.
    if (dateFrom) result = result.filter((entry) => entry.entryDate >= dateFrom);
    if (dateTo) result = result.filter((entry) => entry.entryDate <= dateTo);

    return [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'goal':
          comparison = getGoalName(a.goalId).localeCompare(getGoalName(b.goalId));
          break;
        case 'entryDate':
          comparison = a.entryDate.localeCompare(b.entryDate);
          break;
        case 'actualValue':
          comparison = a.actualValue - b.actualValue;
          break;
        case 'targetValue':
          comparison = a.targetValue - b.targetValue;
          break;
        case 'progress':
          comparison =
            a.actualValue / (a.targetValue || 1) - b.actualValue / (b.targetValue || 1);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [entries, goalFilter, dateFrom, dateTo, sortKey, sortAsc, getGoalName]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      // Updater functions must stay pure, so branch on current state here
      // rather than nesting a setState inside another updater.
      if (sortKey === key) {
        setSortAsc((previous) => !previous);
      } else {
        setSortKey(key);
        setSortAsc(true);
      }
    },
    [sortKey]
  );

  const hasFilters = goalFilter != null || Boolean(dateFrom) || Boolean(dateTo);

  const clearFilters = useCallback(() => {
    setGoalFilter(null);
    setDateFrom('');
    setDateTo('');
  }, []);

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: 'goal', label: 'Goal' },
    { key: 'entryDate', label: 'Date' },
    { key: 'actualValue', label: 'Actual' },
    { key: 'targetValue', label: 'Target' },
    { key: 'progress', label: 'Progress' },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="form-input mb-0 w-auto"
          value={goalFilter ?? ''}
          onChange={(event) => setGoalFilter(event.target.value ? Number(event.target.value) : null)}
          aria-label="Filter by goal"
        >
          <option value="">All Goals</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="form-input mb-0 w-auto"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="form-input mb-0 w-auto"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label="To date"
        />
        {hasFilters ? (
          <button type="button" className="btn btn-secondary mb-0" onClick={clearFilters}>
            Clear
          </button>
        ) : null}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map(({ key, label }) => (
                <th key={key} scope="col" aria-sort={sortKey === key ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <button
                    type="button"
                    className="flex items-center font-semibold"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    {sortKey === key ? (
                      sortAsc ? (
                        <ArrowUp size={14} className="ml-1 inline" />
                      ) : (
                        <ArrowDown size={14} className="ml-1 inline" />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
              <th scope="col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredSorted.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                goalName={getGoalName(entry.goalId)}
                progress={entry.targetValue > 0 ? (entry.actualValue / entry.targetValue) * 100 : 0}
                isDeleting={deletingEntryId === entry.id}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>

        {filteredSorted.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No entries match your filters' : 'No daily entries yet'}
            description={
              hasFilters
                ? 'Try clearing the filters to see all entries.'
                : 'Add your first entry to start tracking progress.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(DailyEntryList);
