export interface Goal {
  id: number;
  name: string;
  unit: string;
  targetValue: number;
  isActive: boolean;
  description?: string;
  daysOfWeek?: string[];
}

export interface WeeklyEntry {
  id: number;
  goalId: number;
  weekStartDate: string;
  actualValue: number;
  targetValue: number;
}

export interface ChartDataResponse {
  weekStart: string;
  goals: Record<string, number>;
  totals: Record<string, number>;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}
