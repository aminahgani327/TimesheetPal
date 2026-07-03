import { findMissingDays, validateRow, weeklyTotal } from '../src/validation';

describe('findMissingDays', () => {
  test('flags all days when there are no rows', () => {
    expect(findMissingDays([])).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
  });

  test('flags no days when every day has hours across rows', () => {
    const rows = [{ mon: 8, tue: 8, wed: 8, thu: 8, fri: 8 }];
    expect(findMissingDays(rows)).toEqual([]);
  });

  test('flags a day that is zero across all rows', () => {
    const rows = [
      { mon: 4, tue: 0, wed: 8, thu: 8, fri: 8 },
      { mon: 4, tue: 0, wed: 0, thu: 0, fri: 0 },
    ];
    expect(findMissingDays(rows)).toEqual(['tue']);
  });
});

describe('validateRow', () => {
  test('rejects a row with no charge code', () => {
    const errors = validateRow({ charge_code: '', mon: 4 });
    expect(errors).toContain('Charge code is required.');
  });

  test('rejects negative hours', () => {
    const errors = validateRow({ charge_code: 'CC100', mon: -2 });
    expect(errors.some((e) => e.includes('non-negative'))).toBe(true);
  });

  test('rejects hours over 24 in a single day', () => {
    const errors = validateRow({ charge_code: 'CC100', mon: 25 });
    expect(errors.some((e) => e.includes('cannot exceed 24'))).toBe(true);
  });

  test('accepts a valid row', () => {
    const errors = validateRow({ charge_code: 'CC100', mon: 8, tue: 7.5 });
    expect(errors).toEqual([]);
  });
});

describe('weeklyTotal', () => {
  test('sums hours across all rows and days', () => {
    const rows = [
      { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8 },
      { mon: 0, tue: 2, wed: 0, thu: 0, fri: 0 },
    ];
    expect(weeklyTotal(rows)).toBe(42);
  });

  test('treats missing values as zero', () => {
    const rows = [{ mon: 5 }];
    expect(weeklyTotal(rows)).toBe(5);
  });
});
