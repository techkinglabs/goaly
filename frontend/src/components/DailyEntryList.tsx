import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Goal, DailyEntry } from '../types';
import { formatDate } from '../api';

interface DailyEntryListProps {
  entries: DailyEntry[];
  goals: Goal[];
  onEdit?: (entry: DailyEntry) => void;
  onDelete?: (id: number) => void;
}

const DailyEntryList: React.FC<DailyEntryListProps> = ({
                                                            entries,
                                                            goals,
                                                            onEdit,
                                                            onDelete
                                                          }) => {
  const getGoalName = (goalId: number) => {
    const goal = goals.find((g) => g.id === goalId);
    return goal ? goal.name : 'Unknown Goal';
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
        <tr>
          <th>Goal</th>
          <th>Date</th>
          <th>Actual</th>
          <th>Target</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
        </thead>

        <tbody>
        {entries.map((entry) => {
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

      {entries.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No daily entries created yet.
          </div>
      )}
    </div>
  );
};

export default DailyEntryList;
