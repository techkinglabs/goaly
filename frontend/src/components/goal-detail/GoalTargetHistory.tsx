import React, { useCallback, useMemo, useState } from 'react';
import type { Goal, TargetHistoryEntry, TargetPeriod } from '../../types';
import { PERIOD_LABELS, TARGET_PERIODS } from '../../types';
import { formatDate } from '../../utils/date';
import { derivePeriodEquivalents } from '../../utils/goalMath';
import { targetHistorySchema, validate } from '../../validation/schemas';
import { useConfirm } from '../ui/ConfirmProvider';
import DatePicker from '../DatePicker';
import FieldError from '../ui/FieldError';
import { CheckIcon, CloseIcon, PencilIcon, PlusIcon, TrashIcon } from '../ui/icons';

interface TargetHistoryInput {
  validFrom: string;
  validTo?: string | null;
  value: number;
  period: TargetPeriod;
}

interface GoalTargetHistoryProps {
  goal: Goal;
  onAdd: (input: TargetHistoryInput) => Promise<unknown>;
  onUpdate: (historyId: number, input: TargetHistoryInput) => Promise<unknown>;
  onDelete: (historyId: number) => Promise<unknown>;
  isMutating?: boolean;
}

interface FormState {
  validFrom: string;
  validTo: string;
  value: string;
  period: TargetPeriod;
}

const EMPTY_FORM: FormState = { validFrom: '', validTo: '', value: '', period: 'WEEK' };

const GoalTargetHistory: React.FC<GoalTargetHistoryProps> = ({
  goal,
  onAdd,
  onUpdate,
  onDelete,
  isMutating = false,
}) => {
  const confirm = useConfirm();
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const sortedHistory = useMemo(
    () =>
      [...(goal.targetHistory ?? [])].sort((a, b) => b.validFrom.localeCompare(a.validFrom)),
    [goal.targetHistory]
  );

  const closeAdd = useCallback(() => {
    setIsAdding(false);
    setAddForm(EMPTY_FORM);
    setAddErrors({});
  }, []);

  const handleAdd = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const result = validate(targetHistorySchema, addForm);
      if (!result.success) {
        setAddErrors(result.fieldErrors);
        return;
      }
      setAddErrors({});
      await onAdd(result.data);
      closeAdd();
    },
    [addForm, onAdd, closeAdd]
  );

  const startEdit = useCallback((entry: TargetHistoryEntry) => {
    setEditingId(entry.id);
    setEditForm({
      validFrom: entry.validFrom,
      validTo: entry.validTo ?? '',
      value: String(entry.value),
      period: entry.period ?? 'WEEK',
    });
    setEditErrors({});
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditErrors({});
  }, []);

  const submitEdit = useCallback(
    async (historyId: number) => {
      const result = validate(targetHistorySchema, editForm);
      if (!result.success) {
        setEditErrors(result.fieldErrors);
        return;
      }
      setEditErrors({});
      await onUpdate(historyId, result.data);
      setEditingId(null);
    },
    [editForm, onUpdate]
  );

  const handleDelete = useCallback(
    async (historyId: number) => {
      const confirmed = await confirm({
        title: 'Delete target change',
        message: 'Are you sure you want to delete this target change?',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (confirmed) await onDelete(historyId);
    },
    [confirm, onDelete]
  );

  const addPreview = useMemo(() => {
    const numeric = Number(addForm.value);
    if (addForm.value.trim() === '' || !Number.isFinite(numeric)) return null;
    return derivePeriodEquivalents(numeric, addForm.period);
  }, [addForm.value, addForm.period]);

  return (
    <div className="pane-detail mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Target History</h3>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="btn btn-primary rounded-full"
          title="Add target change"
          aria-label="Add target change"
          disabled={isAdding}
        >
          <PlusIcon />
        </button>
      </div>

      {isAdding ? (
        <form
          onSubmit={handleAdd}
          className="surface-sunken mb-3 rounded-xl border border-[var(--border)] p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="form-label" htmlFor="target-valid-from">
                Valid From *
              </label>
              <DatePicker
                id="target-valid-from"
                value={addForm.validFrom}
                onChange={(value) => setAddForm((previous) => ({ ...previous, validFrom: value }))}
                className="mb-0"
                invalid={Boolean(addErrors.validFrom)}
              />
              <FieldError message={addErrors.validFrom} />
            </div>
            <div>
              <label className="form-label" htmlFor="target-valid-to">
                Valid To (optional)
              </label>
              <DatePicker
                id="target-valid-to"
                value={addForm.validTo}
                onChange={(value) => setAddForm((previous) => ({ ...previous, validTo: value }))}
                min={addForm.validFrom || undefined}
                className="mb-0"
                invalid={Boolean(addErrors.validTo)}
              />
              <FieldError message={addErrors.validTo} />
            </div>
            <div>
              <label className="form-label" htmlFor="target-value">
                New Value ({goal.unit}) *
              </label>
              <input
                id="target-value"
                type="number"
                step="1"
                value={addForm.value}
                onChange={(event) =>
                  setAddForm((previous) => ({ ...previous, value: event.target.value }))
                }
                className="form-input mb-0"
                aria-invalid={Boolean(addErrors.value)}
              />
              <FieldError message={addErrors.value} />
            </div>
            <div>
              <label className="form-label" htmlFor="target-period">
                Per
              </label>
              <select
                id="target-period"
                value={addForm.period}
                onChange={(event) =>
                  setAddForm((previous) => ({
                    ...previous,
                    period: event.target.value as TargetPeriod,
                  }))
                }
                className="form-input mb-0"
              >
                {TARGET_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {PERIOD_LABELS[period]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addPreview ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Equals ≈ {addPreview.day.toFixed(1)}/day, {addPreview.week.toFixed(1)}/week,{' '}
              {addPreview.month.toFixed(1)}/month, {addPreview.year.toFixed(1)}/year
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button type="submit" className="btn btn-success" disabled={isMutating}>
              Save Change
            </button>
            <button type="button" onClick={closeAdd} className="btn btn-secondary">
              Cancel
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            If Valid To is left empty, the new value stays active forever (until the next change).
          </p>
        </form>
      ) : null}

      {sortedHistory.length === 0 ? (
        <p className="text-[var(--text-muted)]">No target changes recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Valid From</th>
                <th scope="col">Valid To</th>
                <th scope="col">Target</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((entry) => {
                const isEditing = editingId === entry.id;
                const equivalents = derivePeriodEquivalents(
                  Number(entry.value),
                  entry.period ?? 'WEEK'
                );

                if (isEditing) {
                  return (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap p-1 text-sm">
                        <DatePicker
                          value={editForm.validFrom}
                          onChange={(value) =>
                            setEditForm((previous) => ({ ...previous, validFrom: value }))
                          }
                          className="mb-0 w-full"
                          invalid={Boolean(editErrors.validFrom)}
                        />
                      </td>
                      <td className="whitespace-nowrap p-1 text-sm">
                        <DatePicker
                          value={editForm.validTo}
                          onChange={(value) =>
                            setEditForm((previous) => ({ ...previous, validTo: value }))
                          }
                          min={editForm.validFrom || undefined}
                          className="mb-0 w-full"
                          invalid={Boolean(editErrors.validTo)}
                        />
                      </td>
                      <td className="whitespace-nowrap p-1 text-sm">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="1"
                            value={editForm.value}
                            onChange={(event) =>
                              setEditForm((previous) => ({
                                ...previous,
                                value: event.target.value,
                              }))
                            }
                            className="form-input mb-0 w-20"
                            aria-label="Target value"
                          />
                          <select
                            value={editForm.period}
                            onChange={(event) =>
                              setEditForm((previous) => ({
                                ...previous,
                                period: event.target.value as TargetPeriod,
                              }))
                            }
                            className="form-input mb-0"
                            aria-label="Target period"
                          >
                            {TARGET_PERIODS.map((period) => (
                              <option key={period} value={period}>
                                {PERIOD_LABELS[period]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        <FieldError
                          message={editErrors.validFrom ?? editErrors.validTo ?? editErrors.value}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void submitEdit(entry.id)}
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
                            title="Cancel"
                            aria-label="Cancel changes"
                          >
                            <CloseIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-sm">{formatDate(entry.validFrom)}</td>
                    <td className="whitespace-nowrap text-sm">
                      {entry.validTo ? formatDate(entry.validTo) : 'Forever'}
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      <div className="font-medium">
                        {entry.value} {goal.unit}/{PERIOD_LABELS[entry.period ?? 'WEEK']}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        ≈ {equivalents.day.toFixed(1)}/day · {equivalents.week.toFixed(1)}/wk ·{' '}
                        {equivalents.month.toFixed(1)}/mo · {equivalents.year.toFixed(1)}/yr
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="btn-icon text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                          aria-label="Edit target change"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(entry.id)}
                          disabled={isMutating}
                          className="btn-icon text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                          aria-label="Delete target change"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default React.memo(GoalTargetHistory);
