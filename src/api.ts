const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const USER_ID = 'demo-user';

export async function fetchWeek(weekStart: string) {
  const res = await fetch(`${API_BASE}/api/timesheet/${USER_ID}/${weekStart}`);
  if (!res.ok) throw new Error('Failed to load timesheet.');
  return res.json();
}

export async function saveRow(weekStart: string, row: {
  charge_code: string;
  work_location?: string;
  mon: number; tue: number; wed: number; thu: number; fri: number;
}) {
  const res = await fetch(`${API_BASE}/api/timesheet/${USER_ID}/${weekStart}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.errors?.join(' ') || 'Failed to save.');
  }
  return res.json();
}

export async function submitWeek(weekStart: string) {
  const res = await fetch(`${API_BASE}/api/timesheet/${USER_ID}/${weekStart}/submit`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Submission failed.');
  return data;
}

export async function fetchPreviousWeek(weekStart: string) {
  const res = await fetch(`${API_BASE}/api/timesheet/${USER_ID}/${weekStart}/previous`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to load previous week.');
  const data = await res.json();
  return data.rows;
}
