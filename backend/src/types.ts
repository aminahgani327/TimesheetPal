export interface TimesheetRow {
  id?: number;
  user_id: string;
  week_start: string; // ISO date string, always a Monday
  charge_code: string;
  work_location?: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  submitted?: number; // 0 or 1 (SQLite has no native boolean)
  created_at?: string;
}

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export interface ValidationResult {
  errors: string[];
}
