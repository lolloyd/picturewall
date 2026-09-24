const { generateWheelEntries } = require('../js/wheel.js');
const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const path = require('path');

describe('Wheel of Names Functionality & API Integration', () => {
  const testEventId = 'wheel-test-event';

  beforeAll(async () => {
    // Register test event
    await request(app)
      .post('/api/events')
      .send({
        title: 'Wheel Test Event',
        id: testEventId,
        userEmail: 'lloyd.miguel@gmail.com'
      });
  });

  afterAll(() => {
    // Clean up created test directories
    const eventDir = path.join(__dirname, '..', 'Events', testEventId);
    if (fs.existsSync(eventDir)) {
      fs.rmSync(eventDir, { recursive: true, force: true });
    }
  });

  describe('generateWheelEntries unit tests', () => {
    test('creates entries corresponding to user uploads up to max limit', () => {
      const mockImagesGroupedByEmail = {
        'user1@example.com': [
          { url: '/img1.jpg', filename: 'img1.jpg' },
          { url: '/img2.jpg', filename: 'img2.jpg' },
          { url: '/img3.jpg', filename: 'img3.jpg' }
        ],
        'user2@example.com': [
          { url: '/img4.jpg', filename: 'img4.jpg' }
        ]
      };

      // Test default max limit (e.g., 10)
      const entriesMax10 = generateWheelEntries(mockImagesGroupedByEmail, 10);
      expect(entriesMax10.length).toBe(4);

      const user1EntriesMax10 = entriesMax10.filter(e => e.email === 'user1@example.com');
      const user2EntriesMax10 = entriesMax10.filter(e => e.email === 'user2@example.com');

      expect(user1EntriesMax10.length).toBe(3);
      expect(user2EntriesMax10.length).toBe(1);

      // Test configured max limit of 2 entries per email
      const entriesMax2 = generateWheelEntries(mockImagesGroupedByEmail, 2);
      expect(entriesMax2.length).toBe(3); // 2 for user1, 1 for user2

      const user1EntriesMax2 = entriesMax2.filter(e => e.email === 'user1@example.com');
      expect(user1EntriesMax2.length).toBe(2);
    });

    test('ensures no duplicate images are assigned to entries for the same user when entries <= uploaded images', () => {
      const userImages = [
        { url: '/a.jpg', filename: 'a.jpg' },
        { url: '/b.jpg', filename: 'b.jpg' },
        { url: '/c.jpg', filename: 'c.jpg' },
        { url: '/d.jpg', filename: 'd.jpg' }
      ];

      const mockImagesGroupedByEmail = {
        'user1@example.com': userImages
      };

      const entries = generateWheelEntries(mockImagesGroupedByEmail, 3);
      expect(entries.length).toBe(3);

      const assignedUrls = entries.map(e => e.image.url);
      const uniqueAssignedUrls = new Set(assignedUrls);

      expect(uniqueAssignedUrls.size).toBe(3);
    });
  });

  describe('GET /wheel.html and API endpoint integration', () => {
    test('wheel.html is served successfully', async () => {
      const res = await request(app).get('/wheel.html');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Wheel of Names');
      expect(res.text).toContain('wheel-canvas');
    });

    test('GET /api/events/:eventId/images supplies images for wheel', async () => {
      // Upload sample images for 2 users
      const imageBuffer = Buffer.from('test image contents');

      await request(app)
        .post('/api/upload')
        .field('eventId', testEventId)
        .field('userEmail', 'alice@example.com')
        .attach('image', imageBuffer, 'alice1.jpg');

      await request(app)
        .post('/api/upload')
        .field('eventId', testEventId)
        .field('userEmail', 'bob@example.com')
        .attach('image', imageBuffer, 'bob1.jpg');

      const res = await request(app).get(`/api/events/${testEventId}/images`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const emails = res.body.map(img => img.userEmail);
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
    });
  });
});
