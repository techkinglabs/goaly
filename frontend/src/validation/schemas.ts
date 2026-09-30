/**
 * Form validation. Form state is always `string` (what the DOM gives us);
 * these schemas parse + validate on submit and emit typed domain payloads.
 *
 * This is what prevents the `Number('') === 0` family of bugs: an empty
 * numeric field fails validation instead of silently becoming 0 (which
 * previously produced targetValue=0 and division by zero downstream).
 */
import { z } from 'zod';
import { GOAL_PERIODS, TARGET_PERIODS, type GoalPeriod } from '../types';
import { isValidISODate } from '../utils/date';

/** Required numeric string -> number. Rejects '', whitespace and non-numerics. */
function numericString(options: {
  fieldLabel: string;
  min?: number;
  minInclusive?: boolean;
  integer?: boolean;
}) {
  const { fieldLabel, min, minInclusive = true, integer = false } = options;

  return z
    .string()
    .trim()
    .min(1, `${fieldLabel} is required`)
    .refine((value) => Number.isFinite(Number(value)), `${fieldLabel} must be a number`)
    .transform((value) => Number(value))
    .superRefine((value, ctx) => {
      if (integer && !Number.isInteger(value)) {
        ctx.addIssue({ code: 'custom', message: `${fieldLabel} must be a whole number` });
      }
      if (min !== undefined) {
        const ok = minInclusive ? value >= min : value > min;
        if (!ok) {
          ctx.addIssue({
            code: 'custom',
            message: minInclusive
              ? `${fieldLabel} must be at least ${min}`
              : `${fieldLabel} must be greater than ${min}`,
          });
        }
      }
    });
}

/** Optional numeric string -> number | undefined. '' means "not provided". */
function optionalNumericString(options: { fieldLabel: string; min?: number }) {
  const { fieldLabel, min = 0 } = options;

  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : Number(value)))
    .superRefine((value, ctx) => {
      if (value === undefined) return;
      if (!Number.isFinite(value)) {
        ctx.addIssue({ code: 'custom', message: `${fieldLabel} must be a number` });
        return;
      }
      if (value < min) {
        ctx.addIssue({ code: 'custom', message: `${fieldLabel} must be at least ${min}` });
      }
    });
}

const isoDateString = z
  .string()
  .trim()
  .min(1, 'Date is required')
  .refine(isValidISODate, 'Enter a valid date');

const optionalIsoDateString = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || isValidISODate(value), 'Enter a valid date');

/** Raw goal form state — every field is a string/boolean, never `number | ''`. */
export interface GoalFormValues {
  name: string;
  unit: string;
  customUnit: string;
  isCustomUnit: boolean;
  active: boolean;
  description: string;
  targetValue: string;
  period: GoalPeriod;
}

export const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name is too long'),
    unit: z.string(),
    customUnit: z.string(),
    isCustomUnit: z.boolean(),
    active: z.boolean(),
    description: z.string().trim(),
    targetValue: optionalNumericString({ fieldLabel: 'Target value' }),
    period: z.enum(GOAL_PERIODS).optional(),
  })
  .transform((values, ctx) => {
    const resolvedUnit = (values.isCustomUnit ? values.customUnit : values.unit).trim();
    if (!resolvedUnit) {
      ctx.addIssue({
        code: 'custom',
        message: 'Unit is required',
        path: [values.isCustomUnit ? 'customUnit' : 'unit'],
      });
    }
    return {
      name: values.name,
      unit: resolvedUnit,
      active: values.active,
      description: values.description,
      initialTargetValue: values.targetValue,
      initialPeriod: values.period,
    };
  });

export type GoalFormOutput = z.output<typeof goalFormSchema>;

/** Raw daily-entry form state. */
export interface DailyEntryFormValues {
  goalId: string;
  entryDate: string;
  actualValue: string;
  note: string;
}

export const dailyEntryFormSchema = z.object({
  goalId: numericString({ fieldLabel: 'Goal', min: 0, minInclusive: false, integer: true }),
  entryDate: isoDateString,
  actualValue: numericString({ fieldLabel: 'Actual value', min: 0 }),
  note: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value)),
});

export type DailyEntryFormOutput = z.output<typeof dailyEntryFormSchema>;

/** Inline entry row (goal is implied by context). */
export const inlineEntrySchema = z.object({
  entryDate: isoDateString,
  actualValue: numericString({ fieldLabel: 'Value', min: 0 }),
  note: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value)),
});

export type InlineEntryOutput = z.output<typeof inlineEntrySchema>;

/** Target-history row. */
export const targetHistorySchema = z
  .object({
    validFrom: isoDateString,
    validTo: optionalIsoDateString,
    targetValue: numericString({ fieldLabel: 'Target value', min: 0, minInclusive: false }),
    period: z.enum(TARGET_PERIODS),
  })
  .superRefine((values, ctx) => {
    if (values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({
        code: 'custom',
        message: '"Valid to" must not be before "valid from"',
        path: ['validTo'],
      });
    }
  });

export type TargetHistoryOutput = z.output<typeof targetHistorySchema>;

/** Flattens a ZodError into `{ field: firstMessage }` for inline display. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: Record<string, string> };

/** Schema-agnostic validate helper returning field errors instead of throwing. */
export function validate<S extends z.ZodType>(
  schema: S,
  values: unknown
): ParseResult<z.output<S>> {
  const result = schema.safeParse(values);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: toFieldErrors(result.error) };
}
