import { TimesheetRow, WeekDay } from './types';

const DAYS: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

/**
 * Finds weekdays with zero recorded hours across all rows for a week.
 * Mirrors the "missing day" detection described in the original
 * prototype's validation logic.
 */
export function findMissingDays(rows: Partial<TimesheetRow>[]): WeekDay[] {
  if (!rows || rows.length === 0) {
    return DAYS; // no data at all means every day is missing
  }
  return DAYS.filter((day) => rows.every((row) => !row[day] || row[day] === 0));
}

/**
 * Validates a single row before it's saved: charge code required,
 * hours must be non-negative numbers, no single day over 24h.
 */
export function validateRow(row: Partial<TimesheetRow>): string[] {
  const errors: string[] = [];
  if (!row.charge_code || row.charge_code.trim() === '') {
    errors.push('Charge code is required.');
  }
  for (const day of DAYS) {
    const value = row[day];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'number' || value < 0) {
      errors.push(`${day.toUpperCase()} hours must be a non-negative number.`);
    }
    if (value > 24) {
      errors.push(`${day.toUpperCase()} hours cannot exceed 24.`);
    }
  }
  return errors;
}

export function weeklyTotal(rows: Partial<TimesheetRow>[]): number {
  return rows.reduce(
    (sum, row) => sum + DAYS.reduce((rowSum, d) => rowSum + (row[d] || 0), 0),
    0
  );
}
