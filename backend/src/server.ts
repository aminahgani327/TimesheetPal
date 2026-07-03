import express, { Request, Response } from 'express';
import cors from 'cors';
import { rowsRepo } from './db';
import { findMissingDays, validateRow, weeklyTotal } from './validation';
import { TimesheetRow } from './types';

const app = express();
app.use(cors());
app.use(express.json());

// GET a week's rows for a user
app.get('/api/timesheet/:userId/:weekStart', (req: Request, res: Response) => {
  const { userId, weekStart } = req.params;
  const rows = rowsRepo.getWeek(userId, weekStart);
  res.json({
    rows,
    total: weeklyTotal(rows),
    missingDays: findMissingDays(rows),
  });
});

// POST a new/updated row
app.post('/api/timesheet/:userId/:weekStart', (req: Request, res: Response) => {
  const { userId, weekStart } = req.params;
  const row: TimesheetRow = { user_id: userId, week_start: weekStart, ...req.body };

  const errors = validateRow(row);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  rowsRepo.upsertRow(row);
  res.status(201).json({ message: 'Row saved.' });
});

// POST submit — blocks if any weekday has zero hours across all rows,
// matching the original prototype's "submission blocked" behaviour
app.post('/api/timesheet/:userId/:weekStart/submit', (req: Request, res: Response) => {
  const { userId, weekStart } = req.params;
  const rows = rowsRepo.getWeek(userId, weekStart);
  const missingDays = findMissingDays(rows);

  if (missingDays.length > 0) {
    return res.status(400).json({
      message: 'Cannot submit: missing hours on some days.',
      missingDays,
    });
  }

  rowsRepo.markSubmitted(userId, weekStart);
  res.json({ message: 'Timesheet submitted.' });
});

// GET previous week, for the "reuse as template" feature
app.get('/api/timesheet/:userId/:weekStart/previous', (req: Request, res: Response) => {
  const { userId, weekStart } = req.params;
  const previous = rowsRepo.getPreviousWeek(userId, weekStart);
  if (previous.length === 0) {
    return res.status(404).json({ message: 'No previous week data available.' });
  }
  res.json({ rows: previous });
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Timesheet Pal API on port ${PORT}`));
}

export default app;
