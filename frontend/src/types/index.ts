export interface TargetHistoryEntry {
  id: number;
  goalId: number;
  validFrom: string;
  validTo?: string | null;
  value: number;
  period?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
}

export interface Goal {
  id: number;
  name: string;
  unit: string;
  targetValue: number;
  isActive: boolean;
  description?: string;
  daysOfWeek?: string[];
  period?: 'YEAR' | 'MONTH' | 'WEEK' | 'ONGOING';
  amountPerPeriod?: number;
  targetHistory?: TargetHistoryEntry[];
}

export interface DailyEntry {
  id: number;
  goalId: number;
  entryDate: string;
  actualValue: number;
  targetValue: number;
}

export interface ChartDataResponse {
  weekStart?: string;
  entryDate?: string;
  goals: Record<string, number>;
  totals: Record<string, number>;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}
