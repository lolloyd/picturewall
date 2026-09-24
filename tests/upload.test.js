const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

describe('Upload and Image API endpoints', () => {
  const testEventId = 'test-upload-event';
  const testEmail = 'user@example.com';

  afterAll(() => {
    // Clean up created test directories
    const eventDir = path.join(__dirname, '..', 'Events', testEventId);
    if (fs.existsSync(eventDir)) {
      fs.rmSync(eventDir, { recursive: true, force: true });
    }
  });

  test('POST /api/upload uploads image to correct path Events/{eventId}/{userEmail}/{image}', async () => {
    // Create dummy buffer image
    const imageBuffer = Buffer.from('fake image content');

    const res = await request(app)
      .post('/api/upload')
      .field('eventId', testEventId)
      .field('userEmail', testEmail)
      .attach('image', imageBuffer, 'sample.jpg');

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('path');
    expect(res.body.path).toContain(`Events/${testEventId}/${testEmail}/`);

    // Check that file actually exists on filesystem
    const diskPath = path.join(__dirname, '..', res.body.path);
    expect(fs.existsSync(diskPath)).toBe(true);
  });

  test('GET /api/events/:eventId/images lists uploaded images', async () => {
    const res = await request(app).get(`/api/events/${testEventId}/images`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('userEmail', testEmail);
    expect(res.body[0]).toHaveProperty('url');
  });
});
