const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns API status and database state', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'auction-by-api'
    });
    expect(response.body.database).toHaveProperty('status');
  });
});
