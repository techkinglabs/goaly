export interface Goal {
  id: number;
  name: string;
  unit: string;
  targetValue: number;
  isActive: boolean;
}

export interface WeeklyEntry {
  id: number;
  goalId: number;
  weekStartDate: string;
  actualValue: number;
  targetValue: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}