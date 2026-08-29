import React, { useCallback, useMemo, useState } from 'react';
import type { DailyEntry, Goal } from '../../types';
import { formatDate, todayISO } from '../../utils/date';
import { inlineEntrySchema, validate } from '../../validation/schemas';
import DatePicker from '../DatePicker';
import FieldError from '../ui/FieldError';
import { CheckIcon, CloseIcon, PencilIcon, PlusIcon, TrashIcon } from '../ui/icons';

export interface InlineEntryValues {
  entryDate: string;
  actualValue: number;
  note: string | null;
}

interface GoalEntriesTableProps {
  goal: Goal;
  entries: DailyEntry[];
  onCreate: (values: InlineEntryValues) => void | Promise<unknown>;
  onUpdate?: (entry: DailyEntry, values: InlineEntryValues) => void | Promise<unknown>;
  onDelete?: (id: number) => void | Promise<unknown>;
  isMutating?: boolean;
  deletingEntryId?: number | null;
}

interface RowForm {
  entryDate: string;
  value: string;
  note: string;
}

const emptyRow = (): RowForm => ({ entryDate: todayISO(), value: '', note: '' });

/**
 * Keyboard affordance for the inline rows: Enter commits, Escape cancels.
 * Enter inside a textarea still inserts a newline.
 */
function useRowKeyDown(onEnter: () => void, onEscape: () => void) {
  return useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key === 'Enter' && (event.target as HTMLElement).tagName !== 'TEXTAREA') {
        event.preventDefault();
        onEnter();
      }
    },
    [onEnter, onEscape]
  );
}

const GoalEntriesTable: React.FC<GoalEntriesTableProps> = ({
  goal,
  entries,
  onCreate,
  onUpdate,
  onDelete,
  isMutating = false,
  deletingEntryId = null,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<RowForm>(emptyRow);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RowForm>(emptyRow);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Newest first.
  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate)),
    [entries]
  );

  const startAdd = useCallback(() => {
    setAddForm(emptyRow());
    setAddErrors({});
    setIsAdding(true);
  }, []);

  const cancelAdd = useCallback(() => {
    setIsAdding(false);
    setAddErrors({});
  }, []);

  const commitAdd = useCallback(() => {
    const result = validate(inlineEntrySchema, {
      entryDate: addForm.entryDate,
      actualValue: addForm.value,
      note: addForm.note,
    });
    if (!result.success) {
      setAddErrors(result.fieldErrors);
      return;
    }
    setAddErrors({});
    void onCreate(result.data);
    setIsAdding(false);
  }, [addForm, onCreate]);

  const startEdit = useCallback((entry: DailyEntry) => {
    setEditingId(entry.id);
    setEditForm({
      entryDate: entry.entryDate,
      value: String(entry.actualValue),
      note: entry.note ?? '',
    });
    setEditErrors({});
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditErrors({});
  }, []);

  const commitEdit = useCallback(
    (entry: DailyEntry) => {
      const result = validate(inlineEntrySchema, {
        entryDate: editForm.entryDate,
        actualValue: editForm.value,
        note: editForm.note,
      });
      if (!result.success) {
        setEditErrors(result.fieldErrors);
        return;
      }
      setEditErrors({});
      void onUpdate?.(entry, result.data);
      setEditingId(null);
    },
    [editForm, onUpdate]
  );

  const addRowKeyDown = useRowKeyDown(commitAdd, cancelAdd);

  const addError = addErrors.entryDate ?? addErrors.actualValue;
  const editError = editErrors.entryDate ?? editErrors.actualValue;

  return (
    <div className="pane-detail min-h-[70vh]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Recent Entries</h3>
        <button
          type="button"
          onClick={startAdd}
          className="btn btn-primary rounded-full"
          title="Add Entry"
          aria-label="Add entry"
          disabled={isAdding}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Actual Value</th>
              <th scope="col">Note</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isAdding ? (
              <tr onKeyDown={addRowKeyDown}>
                <td className="p-2 align-top text-sm">
                  <DatePicker
                    value={addForm.entryDate}
                    onChange={(value) => setAddForm((previous) => ({ ...previous, entryDate: value }))}
                    className="mb-0 w-full"
                    autoFocus
                    invalid={Boolean(addErrors.entryDate)}
                  />
                </td>
                <td className="p-2 align-top text-sm">
                  <input
                    type="number"
                    value={addForm.value}
                    onChange={(event) =>
                      setAddForm((previous) => ({ ...previous, value: event.target.value }))
                    }
                    className="form-input mb-0 w-full"
                    placeholder={goal.unit}
                    aria-label="Actual value"
                    aria-invalid={Boolean(addErrors.actualValue)}
                  />
                </td>
                <td className="p-2 align-top text-sm">
                  <textarea
                    value={addForm.note}
                    onChange={(event) =>
                      setAddForm((previous) => ({ ...previous, note: event.target.value }))
                    }
                    className="form-input mb-0 w-full"
                    rows={3}
                    placeholder="Add a note…"
                    aria-label="Note"
                  />
                </td>
                <td className="p-2 align-top text-sm">
                  <FieldError message={addError} />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={commitAdd}
                      disabled={isMutating}
                      className="btn-icon text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      title="Accept"
                      aria-label="Accept new entry"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      type="button"
                      onClick={cancelAdd}
                      className="btn-icon text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Reject"
                      aria-label="Reject new entry"
                    >
                      <CloseIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ) : null}

            {recentEntries.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[var(--text-muted)]">
                  No entries yet for this goal
                </td>
              </tr>
            ) : null}

            {recentEntries.map((entry) => {
              const isEditing = editingId === entry.id;

              if (isEditing) {
                return (
                  <tr
                    key={entry.id}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelEdit();
                      } else if (
                        event.key === 'Enter' &&
                        (event.target as HTMLElement).tagName !== 'TEXTAREA'
                      ) {
                        event.preventDefault();
                        commitEdit(entry);
                      }
                    }}
                  >
                    <td className="whitespace-nowrap p-1 text-sm">
                      <DatePicker
                        value={editForm.entryDate}
                        onChange={(value) =>
                          setEditForm((previous) => ({ ...previous, entryDate: value }))
                        }
                        className="mb-0 w-full"
                        invalid={Boolean(editErrors.entryDate)}
                      />
                    </td>
                    <td className="p-2 align-top text-sm">
                      <input
                        type="number"
                        value={editForm.value}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, value: event.target.value }))
                        }
                        className="form-input mb-0 w-full"
                        aria-label="Actual value"
                        aria-invalid={Boolean(editErrors.actualValue)}
                      />
                    </td>
                    <td className="p-2 align-top text-sm">
                      <textarea
                        value={editForm.note}
                        onChange={(event) =>
                          setEditForm((previous) => ({ ...previous, note: event.target.value }))
                        }
                        className="form-input mb-0 w-full"
                        rows={3}
                        placeholder="Add a note…"
                        aria-label="Note"
                      />
                    </td>
                    <td className="p-2 align-top text-sm">
                      <FieldError message={editError} />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => commitEdit(entry)}
                          disabled={isMutating}
                          className="btn-icon text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Accept"
                          aria-label="Accept changes"
                        >
                          <CheckIcon />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="btn-icon text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Reject"
                          aria-label="Reject changes"
                        >
                          <CloseIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={entry.id} className={deletingEntryId === entry.id ? 'opacity-50' : undefined}>
                  <td className="p-2 align-top text-sm">{formatDate(entry.entryDate)}</td>
                  <td className="p-2 align-top text-sm">
                    {entry.actualValue} {goal.unit}
                  </td>
                  <td className="p-2 align-top text-sm text-[var(--text-secondary)]">
                    {entry.note || <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="p-2 align-top text-sm">
                    <div className="flex items-center gap-1">
                      {onUpdate ? (
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="btn-icon text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                          aria-label="Edit entry"
                        >
                          <PencilIcon />
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => void onDelete(entry.id)}
                          disabled={deletingEntryId === entry.id}
                          className="btn-icon text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                          aria-label="Delete entry"
                        >
                          <TrashIcon />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(GoalEntriesTable);
