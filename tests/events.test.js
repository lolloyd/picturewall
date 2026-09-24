const request = require('supertest');
const app = require('../server');

describe('Event API endpoints', () => {
  test('GET /api/config returns app configuration', async () => {
    const res = await request(app).get('/api/config');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('adminEmail', 'lloyd.miguel@gmail.com');
  });

  test('POST /api/events creates event for admin user', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        title: 'Tech Conference 2025',
        description: 'Annual meet',
        id: 'tech-2025',
        userEmail: 'lloyd.miguel@gmail.com'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id', 'tech-2025');
    expect(res.body).toHaveProperty('title', 'Tech Conference 2025');
  });

  test('POST /api/events fails for non-admin user', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        title: 'Party',
        userEmail: 'john@gmail.com'
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toContain('Unauthorized');
  });

  test('GET /api/events lists created events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(e => e.id === 'tech-2025')).toBe(true);
  });

  test('GET /api/events/:eventId returns specific event', async () => {
    const res = await request(app).get('/api/events/tech-2025');
    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toEqual('Tech Conference 2025');
  });
});
