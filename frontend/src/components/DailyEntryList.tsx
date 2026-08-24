import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Goal, DailyEntry } from '../types';
import { formatDate } from '../api';

interface DailyEntryListProps {
  entries: DailyEntry[];
  goals: Goal[];
  onEdit?: (entry: DailyEntry) => void;
  onDelete?: (id: number) => void;
}

type SortKey = 'goal' | 'entryDate' | 'actualValue' | 'targetValue' | 'progress';

const DailyEntryList: React.FC<DailyEntryListProps> = ({
  entries,
  goals,
  onEdit,
  onDelete
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('entryDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [goalFilter, setGoalFilter] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const goalNameMap = useMemo(() => {
    const map = new Map<number, string>();
    goals.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [goals]);

  const getGoalName = (goalId: number) => goalNameMap.get(goalId) ?? 'Unknown Goal';

  const filteredSorted = useMemo(() => {
    let result = entries.slice();

    if (goalFilter != null) {
      result = result.filter((e) => e.goalId === goalFilter);
    }
    if (dateFrom) {
      result = result.filter((e) => e.entryDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => e.entryDate <= dateTo);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'goal':
          cmp = getGoalName(a.goalId).localeCompare(getGoalName(b.goalId));
          break;
        case 'entryDate':
          cmp = a.entryDate.localeCompare(b.entryDate);
          break;
        case 'actualValue':
          cmp = a.actualValue - b.actualValue;
          break;
        case 'targetValue':
          cmp = a.targetValue - b.targetValue;
          break;
        case 'progress':
          cmp = (a.actualValue / (a.targetValue || 1)) - (b.actualValue / (b.targetValue || 1));
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [entries, goalFilter, dateFrom, dateTo, sortKey, sortAsc, goalNameMap]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortAsc ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          className="form-input !mb-0 w-auto"
          value={goalFilter ?? ''}
          onChange={(e) => setGoalFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Goals</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-input !mb-0 w-auto"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="form-input !mb-0 w-auto"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
        {(goalFilter != null || dateFrom || dateTo) && (
          <button
            className="btn btn-secondary !mb-0"
            onClick={() => { setGoalFilter(null); setDateFrom(''); setDateTo(''); }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>
              <button className="flex items-center font-semibold" onClick={() => toggleSort('goal')}>
                Goal{renderSortIcon('goal')}
              </button>
            </th>
            <th>
              <button className="flex items-center font-semibold" onClick={() => toggleSort('entryDate')}>
                Date{renderSortIcon('entryDate')}
              </button>
            </th>
            <th>
              <button className="flex items-center font-semibold" onClick={() => toggleSort('actualValue')}>
                Actual{renderSortIcon('actualValue')}
              </button>
            </th>
            <th>
              <button className="flex items-center font-semibold" onClick={() => toggleSort('targetValue')}>
                Target{renderSortIcon('targetValue')}
              </button>
            </th>
            <th>
              <button className="flex items-center font-semibold" onClick={() => toggleSort('progress')}>
                Progress{renderSortIcon('progress')}
              </button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredSorted.map((entry) => {
            const progress =
              entry.targetValue > 0
                ? (entry.actualValue / entry.targetValue) * 100
                : 0;

            return (
              <tr key={entry.id}>
                <td className="whitespace-nowrap">{getGoalName(entry.goalId)}</td>

                <td className="whitespace-nowrap">{formatDate(entry.entryDate)}</td>

                <td className="whitespace-nowrap">{entry.actualValue}</td>

                <td className="whitespace-nowrap">{entry.targetValue}</td>

                <td className="whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="progress-track w-24 h-2.5 mr-2">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                        }}
                      />
                    </div>

                    <span>{progress.toFixed(0)}%</span>
                  </div>
                </td>

                <td className="whitespace-nowrap text-sm font-medium">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(entry)}
                      aria-label="Edit entry"
                      title="Edit"
                      className="text-indigo-600 hover:text-indigo-900 mr-3 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      aria-label="Delete entry"
                      title="Delete"
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredSorted.length === 0 && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          No daily entries found.
        </div>
      )}
      </div>
    </div>
  );
};

export default DailyEntryList;
