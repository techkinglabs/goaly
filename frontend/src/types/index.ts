/** Shared domain model. Mirrors the backend DTOs. */
import type { ISODateString } from '../utils/date';

export const GOAL_PERIODS = ['YEAR', 'MONTH', 'WEEK', 'WORKWEEK', 'WEEKEND', 'DAY'] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const TARGET_PERIODS = ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const;
export type TargetPeriod = (typeof TARGET_PERIODS)[number];

export const GOAL_FILTERS = ['active', 'inactive', 'all'] as const;
export type GoalFilter = (typeof GOAL_FILTERS)[number];

export const CHART_RANGES = ['7d', '30d', '365d', 'week', 'year', 'all'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

export interface TargetHistoryEntry {
  id: number;
  goalId: number;
  validFrom: ISODateString;
  validTo?: ISODateString | null;
  value: number;
  period?: GoalPeriod;
}

export interface Goal {
  id: number;
  name: string;
  unit: string;
  targetValue: number;
  isActive: boolean;
  description?: string;
  period?: GoalPeriod;
  amountPerPeriod?: number;
  targetHistory?: TargetHistoryEntry[];
}

export interface DailyEntry {
  id: number;
  goalId: number;
  entryDate: ISODateString;
  actualValue: number;
  targetValue: number;
  note?: string | null;
}

export interface ChartDataPoint {
  label: string;
  goals: Record<number, number>;
  totals: Record<number, number>;
  targets: Record<number, number>;
}

/** Write models — `id` is server-assigned, so it is never part of a payload. */
export interface GoalPayload {
  name: string;
  unit: string;
  targetValue: number;
  isActive: boolean;
  description?: string;
  period?: GoalPeriod;
  amountPerPeriod?: number;
  initialTargetValue?: number;
}

export interface DailyEntryPayload {
  goalId: number;
  entryDate: ISODateString;
  actualValue: number;
  targetValue?: number;
  note?: string | null;
}

export const CHART_RANGE_LABELS: Record<ChartRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '365d': 'Last 365 days',
  week: 'This Week',
  year: 'This Year',
  all: 'All',
};

export const GOAL_FILTER_LABELS: Record<GoalFilter, string> = {
  active: 'Active',
  inactive: 'Inactive',
  all: 'All',
};

export const PERIOD_LABELS: Record<string, string> = {
  YEAR: 'Year',
  MONTH: 'Month',
  WEEK: 'Week',
  WORKWEEK: 'Workweek',
  WEEKEND: 'Weekend',
  DAY: 'Day',
};

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  WEEK: 'Per Week',
  WORKWEEK: 'Per Workweek (5 days)',
  WEEKEND: 'Per Weekend (2 days)',
  MONTH: 'Per Month',
  YEAR: 'Per Year',
  DAY: 'Per Day',
};

/** Predefined unit options; anything else is entered as a custom unit. */
export const PREDEFINED_UNITS = ['km', 'min', 'hours', 'steps', 'kcal', 'protein'] as const;
