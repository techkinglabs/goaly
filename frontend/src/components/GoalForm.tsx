import React, { useCallback, useMemo, useState } from 'react';
import type { Goal, GoalPayload } from '../types';
import { GOAL_PERIODS, GOAL_PERIOD_LABELS, PREDEFINED_UNITS } from '../types';
import { goalFormSchema, validate, type GoalFormValues } from '../validation/schemas';
import FieldError from './ui/FieldError';
import { SpinnerIcon } from './ui/icons';

export type GoalFormMode = 'create' | 'edit';

interface GoalFormProps {
  mode: GoalFormMode;
  /** Required for `mode='edit'`; seeds the initial values. */
  goal?: Goal;
  onSubmit: (payload: GoalPayload) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

function buildInitialValues(goal?: Goal): GoalFormValues {
  if (!goal) {
    return {
      name: '',
      unit: '',
      customUnit: '',
      isCustomUnit: false,
      targetValue: '',
      amountPerPeriod: '',
      period: 'WEEK',
      isActive: true,
      description: '',
    };
  }

  const isPredefined = (PREDEFINED_UNITS as readonly string[]).includes(goal.unit);
  return {
    name: goal.name,
    unit: isPredefined ? goal.unit : '',
    customUnit: isPredefined ? '' : goal.unit,
    isCustomUnit: !isPredefined,
    // Numeric fields are strings in form state — never `number | ''`.
    targetValue: String(goal.targetValue ?? ''),
    amountPerPeriod: String(goal.amountPerPeriod ?? goal.targetValue ?? ''),
    period: goal.period ?? 'WEEK',
    isActive: goal.isActive,
    description: goal.description ?? '',
  };
}

/**
 * One form for both creating and editing a goal (previously two ~80% identical
 * components). Validation happens on submit via zod, so an empty numeric field
 * is a validation error rather than a silent `Number('') === 0`.
 */
const GoalForm: React.FC<GoalFormProps> = ({
  mode,
  goal,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  // Remount-on-goal-change is handled by the caller via `key`, so deriving the
  // initial state once here is correct and avoids a sync effect.
  const [values, setValues] = useState<GoalFormValues>(() => buildInitialValues(goal));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = useCallback(
    <K extends keyof GoalFormValues>(field: K, value: GoalFormValues[K]) => {
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

  const handleUnitChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = event.target.value;
      if (selected === 'custom') {
        setValues((previous) => ({ ...previous, isCustomUnit: true, unit: '' }));
      } else {
        setValues((previous) => ({ ...previous, isCustomUnit: false, unit: selected }));
      }
      setErrors((previous) => ({ ...previous, unit: '', customUnit: '' }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const result = validate(goalFormSchema, values);

      if (!result.success) {
        setErrors(result.fieldErrors);
        return;
      }

      setErrors({});
      await onSubmit({
        name: result.data.name,
        unit: result.data.unit,
        targetValue: result.data.targetValue,
        isActive: result.data.isActive,
        description: result.data.description,
        period: result.data.period,
        amountPerPeriod: result.data.amountPerPeriod,
        // The create endpoint seeds the initial target-history row.
        ...(mode === 'create' ? { initialTargetValue: result.data.targetValue } : {}),
      });

      if (mode === 'create') {
        setValues(buildInitialValues());
      }
    },
    [values, onSubmit, mode]
  );

  const submitLabel = mode === 'create' ? 'Create Goal' : 'Update Goal';
  const unitSelectValue = values.isCustomUnit ? 'custom' : values.unit;

  const periodOptions = useMemo(
    () => GOAL_PERIODS.map((period) => ({ value: period, label: GOAL_PERIOD_LABELS[period] })),
    []
  );

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      {mode === 'edit' ? (
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Edit Goal</h3>
      ) : null}

      <div className="mb-4">
        <label className="form-label" htmlFor="goal-name">
          Name *
        </label>
        <input
          id="goal-name"
          type="text"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          className="form-input"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'goal-name-error' : undefined}
        />
        <FieldError id="goal-name-error" message={errors.name} />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="goal-unit">
          Unit *
        </label>
        <select
          id="goal-unit"
          value={unitSelectValue}
          onChange={handleUnitChange}
          className="form-input"
          aria-invalid={Boolean(errors.unit)}
          aria-describedby={errors.unit ? 'goal-unit-error' : undefined}
        >
          <option value="">Select a unit</option>
          {PREDEFINED_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        <FieldError id="goal-unit-error" message={errors.unit} />

        {values.isCustomUnit ? (
          <>
            <input
              type="text"
              value={values.customUnit}
              onChange={(event) => setField('customUnit', event.target.value)}
              placeholder="Enter custom unit"
              className="form-input mt-2"
              aria-label="Custom unit"
              aria-invalid={Boolean(errors.customUnit)}
              aria-describedby={errors.customUnit ? 'goal-custom-unit-error' : undefined}
            />
            <FieldError id="goal-custom-unit-error" message={errors.customUnit} />
          </>
        ) : null}
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="goal-target-value">
          {mode === 'create' ? 'Target Value (initial / current) *' : 'Target Value *'}
        </label>
        <input
          id="goal-target-value"
          type="number"
          step="1"
          value={values.targetValue}
          onChange={(event) => setField('targetValue', event.target.value)}
          className="form-input"
          aria-invalid={Boolean(errors.targetValue)}
          aria-describedby={errors.targetValue ? 'goal-target-value-error' : undefined}
        />
        <FieldError id="goal-target-value-error" message={errors.targetValue} />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="goal-period">
          Period
        </label>
        <select
          id="goal-period"
          value={values.period}
          onChange={(event) => setField('period', event.target.value)}
          className="form-input"
        >
          {periodOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="goal-amount-per-period">
          Amount per Period
        </label>
        <input
          id="goal-amount-per-period"
          type="number"
          step="1"
          value={values.amountPerPeriod}
          onChange={(event) => setField('amountPerPeriod', event.target.value)}
          placeholder="Defaults to Target Value if empty"
          className="form-input"
          aria-invalid={Boolean(errors.amountPerPeriod)}
          aria-describedby={errors.amountPerPeriod ? 'goal-amount-error' : undefined}
        />
        <FieldError id="goal-amount-error" message={errors.amountPerPeriod} />
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => setField('isActive', event.target.checked)}
            className="mr-2 rounded accent-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">Active Goal</span>
        </label>
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="goal-description">
          Description
        </label>
        <textarea
          id="goal-description"
          value={values.description}
          onChange={(event) => setField('description', event.target.value)}
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
          className={mode === 'edit' ? 'btn btn-primary' : 'btn btn-primary w-full'}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon className="h-4 w-4" />
              Saving…
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;
