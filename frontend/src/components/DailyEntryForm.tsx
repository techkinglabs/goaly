import React, { useCallback, useState } from 'react';
import type { DailyEntry, DailyEntryPayload, Goal } from '../types';
import { todayISO } from '../utils/date';
import { dailyEntryFormSchema, validate, type DailyEntryFormValues } from '../validation/schemas';
import DatePicker from './DatePicker';
import FieldError from './ui/FieldError';
import { SpinnerIcon } from './ui/icons';

export type DailyEntryFormMode = 'create' | 'edit';

export interface GoalOption {
  id: number;
  name: string;
}

interface DailyEntryFormProps {
  mode: DailyEntryFormMode;
  goals: GoalOption[] | Goal[];
  /** Required for `mode='edit'`. */
  entry?: DailyEntry;
  onSubmit: (payload: DailyEntryPayload) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

function buildInitialValues(
  goals: GoalOption[] | Goal[],
  entry?: DailyEntry
): DailyEntryFormValues {
  if (entry) {
    return {
      goalId: String(entry.goalId),
      entryDate: entry.entryDate,
      actualValue: String(entry.actualValue),
      note: entry.note ?? '',
    };
  }
  return {
    // Preselect the first goal, as the original create form did.
    goalId: goals.length > 0 ? String(goals[0].id) : '',
    entryDate: todayISO(),
    actualValue: '',
    note: '',
  };
}

/**
 * One form for creating and editing a daily entry (previously two near-identical
 * components). `targetValue` is carried through from the existing entry — it is
 * server-derived and stays read-only, as before.
 */
const DailyEntryForm: React.FC<DailyEntryFormProps> = ({
  mode,
  goals,
  entry,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [values, setValues] = useState<DailyEntryFormValues>(() =>
    buildInitialValues(goals, entry)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = useCallback(
    <K extends keyof DailyEntryFormValues>(field: K, value: DailyEntryFormValues[K]) => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => {
        if (!previous[field as string]) return previous;
        const next = { ...previous };
        delete next[field as string];
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const result = validate(dailyEntryFormSchema, values);

      if (!result.success) {
        setErrors(result.fieldErrors);
        return;
      }

      setErrors({});
      await onSubmit({
        goalId: result.data.goalId,
        entryDate: result.data.entryDate,
        actualValue: result.data.actualValue,
        note: result.data.note,
        ...(entry ? { targetValue: entry.targetValue } : {}),
      });

      if (mode === 'create') {
        setValues((previous) => ({ ...previous, actualValue: '', note: '' }));
      }
    },
    [values, onSubmit, mode, entry]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      {mode === 'edit' ? (
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Edit Daily Entry</h3>
      ) : null}

      <div className="mb-4">
        <label className="form-label" htmlFor="entry-goal">
          Goal *
        </label>
        <select
          id="entry-goal"
          value={values.goalId}
          onChange={(event) => setField('goalId', event.target.value)}
          className="form-input"
          aria-invalid={Boolean(errors.goalId)}
          aria-describedby={errors.goalId ? 'entry-goal-error' : undefined}
        >
          <option value="">Select a goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.name}
            </option>
          ))}
        </select>
        <FieldError id="entry-goal-error" message={errors.goalId} />
        {goals.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create a goal before adding entries.
          </p>
        ) : null}
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="entry-date">
          Entry Date *
        </label>
        <DatePicker
          id="entry-date"
          value={values.entryDate}
          onChange={(value) => setField('entryDate', value)}
          className="mb-0"
          invalid={Boolean(errors.entryDate)}
        />
        <FieldError id="entry-date-error" message={errors.entryDate} />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="entry-actual-value">
          Actual Value *
        </label>
        <input
          id="entry-actual-value"
          type="number"
          step="1"
          value={values.actualValue}
          onChange={(event) => setField('actualValue', event.target.value)}
          className="form-input"
          aria-invalid={Boolean(errors.actualValue)}
          aria-describedby={errors.actualValue ? 'entry-actual-value-error' : undefined}
        />
        <FieldError id="entry-actual-value-error" message={errors.actualValue} />
      </div>

      {mode === 'edit' && entry ? (
        <div className="mb-4">
          <label className="form-label" htmlFor="entry-target-value">
            Target Value
          </label>
          <input
            id="entry-target-value"
            type="number"
            value={entry.targetValue}
            readOnly
            disabled
            className="form-input cursor-not-allowed opacity-70"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Derived from the goal target for this date.
          </p>
        </div>
      ) : null}

      <div className="mb-4">
        <label className="form-label" htmlFor="entry-note">
          Note (optional)
        </label>
        <textarea
          id="entry-note"
          value={values.note}
          onChange={(event) => setField('note', event.target.value)}
          className="form-input"
          rows={3}
        />
      </div>

      <FieldError message={errors._form} />

      <div className={mode === 'edit' ? 'flex justify-end gap-3' : ''}>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className={mode === 'edit' ? 'btn btn-primary' : 'btn btn-success w-full'}
          disabled={isSubmitting || goals.length === 0}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon className="h-4 w-4" />
              Saving…
            </span>
          ) : mode === 'create' ? (
            'Add Entry'
          ) : (
            'Update Entry'
          )}
        </button>
      </div>
    </form>
  );
};

export default DailyEntryForm;
