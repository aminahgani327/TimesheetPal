import request from 'supertest';
import app from '../src/server';

describe('POST /api/timesheet/:userId/:weekStart', () => {
  test('rejects a row with no charge code', async () => {
    const res = await request(app)
      .post('/api/timesheet/testuser/2026-07-06')
      .send({ mon: 8 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('Charge code is required.');
  });

  test('accepts and saves a valid row', async () => {
    const res = await request(app)
      .post('/api/timesheet/testuser/2026-07-06')
      .send({ charge_code: 'CC100', mon: 8, tue: 8 });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/timesheet/:userId/:weekStart/submit', () => {
  test('blocks submission when a day is missing hours', async () => {
    const week = '2026-07-13';
    await request(app)
      .post(`/api/timesheet/testuser2/${week}`)
      .send({ charge_code: 'CC100', mon: 8, tue: 8, wed: 8, thu: 8, fri: 0 });

    const res = await request(app).post(`/api/timesheet/testuser2/${week}/submit`);
    expect(res.status).toBe(400);
    expect(res.body.missingDays).toContain('fri');
  });
});
