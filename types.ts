
export interface Wish {
  id: string;
  name: string;
  price: number;
  progress: number;
  completed: boolean;
}

export interface WorkConfig {
  annualSalary: number;
  daysPerYear: number;
  hoursPerDay: number;
}

export interface Statistics {
  totalEarnedToday: number;
  totalEarnedThisWeek: number;
  totalEarnedThisMonth: number;
  totalSavings: number;
  savingsGoal: number | null;
}

export enum TimeRange {
  WEEK = '本周',
  MONTH = '本月'
}
