const request = require('supertest');
const app = require('../src/app');

describe('not found handler', () => {
  it('returns 404 for unknown API routes', async () => {
    const response = await request(app).get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Route not found: /api/unknown-route');
  });
});
