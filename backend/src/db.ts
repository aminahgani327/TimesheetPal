import Database from 'better-sqlite3';
import path from 'path';
import { TimesheetRow } from './types';

const db = new Database(path.join(__dirname, '../data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS timesheet_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    week_start TEXT NOT NULL,
    charge_code TEXT NOT NULL,
    work_location TEXT,
    mon REAL DEFAULT 0,
    tue REAL DEFAULT 0,
    wed REAL DEFAULT 0,
    thu REAL DEFAULT 0,
    fri REAL DEFAULT 0,
    submitted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Repository pattern: all data access goes through these typed functions,
// so swapping SQLite for Postgres later (per ADR-001) only touches this file.
export const rowsRepo = {
  getWeek(userId: string, weekStart: string): TimesheetRow[] {
    return db
      .prepare('SELECT * FROM timesheet_rows WHERE user_id = ? AND week_start = ?')
      .all(userId, weekStart) as TimesheetRow[];
  },

  upsertRow(row: TimesheetRow) {
    // better-sqlite3 rejects `undefined` bound parameters (it only accepts
    // real values or null), so any field not sent by the client needs an
    // explicit default here before binding — otherwise a partial row
    // (e.g. only charge_code + mon) throws a runtime error rather than
    // failing validation cleanly.
    const complete = {
      user_id: row.user_id,
      week_start: row.week_start,
      charge_code: row.charge_code,
      work_location: row.work_location ?? null,
      mon: row.mon ?? 0,
      tue: row.tue ?? 0,
      wed: row.wed ?? 0,
      thu: row.thu ?? 0,
      fri: row.fri ?? 0,
    };
    const stmt = db.prepare(`
      INSERT INTO timesheet_rows
        (user_id, week_start, charge_code, work_location, mon, tue, wed, thu, fri)
      VALUES (@user_id, @week_start, @charge_code, @work_location, @mon, @tue, @wed, @thu, @fri)
    `);
    return stmt.run(complete);
  },

  markSubmitted(userId: string, weekStart: string) {
    return db
      .prepare('UPDATE timesheet_rows SET submitted = 1 WHERE user_id = ? AND week_start = ?')
      .run(userId, weekStart);
  },

  getPreviousWeek(userId: string, currentWeekStart: string): TimesheetRow[] {
    return db
      .prepare(
        `SELECT * FROM timesheet_rows
         WHERE user_id = ? AND week_start < ?
         ORDER BY week_start DESC
         LIMIT 20`
      )
      .all(userId, currentWeekStart) as TimesheetRow[];
  },
};

export default db;
