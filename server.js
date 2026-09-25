const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for events
const events = new Map();

// Default admin email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lloyd.miguel@gmail.com';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Setup Multer Storage for Events/{eventId}/{userEmail}/{image}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventId = req.body.eventId || 'default';
    const userEmail = (req.body.userEmail || 'anonymous').trim().toLowerCase();
    const destDir = path.join(__dirname, 'Events', eventId, userEmail);
    fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E4);
    cb(null, `${uniquePrefix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// App config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    adminEmail: ADMIN_EMAIL,
    googleClientId: GOOGLE_CLIENT_ID
  });
});

// List events endpoint
app.get('/api/events', (req, res) => {
  const eventList = Array.from(events.values());
  res.json(eventList);
});

// Helper function to safely resolve event directory path and prevent path traversal
function getSafeEventDir(eventId) {
  if (!eventId || typeof eventId !== 'string') return null;
  const eventsBaseDir = path.resolve(__dirname, 'Events');
  const targetDir = path.resolve(eventsBaseDir, eventId);
  // Security check: Ensure target directory stays inside Events directory
  if (!targetDir.startsWith(eventsBaseDir + path.sep) && targetDir !== eventsBaseDir) {
    return null;
  }
  return targetDir;
}

// Get single event details
app.get('/api/events/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  const eventDir = getSafeEventDir(eventId);
  if (!eventDir) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const event = events.get(eventId);
  if (!event) {
    // Return standard response even if not pre-registered in memory if directory exists
    if (fs.existsSync(eventDir)) {
      return res.json({ id: eventId, title: `Event ${eventId}`, description: '' });
    }
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

// Create event endpoint
app.post('/api/events', (req, res) => {
  const { title, description, id, userEmail } = req.body;

  if (!title || !userEmail) {
    return res.status(400).json({ error: 'Title and userEmail are required' });
  }

  // Check admin access (case-insensitive)
  if (userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized: Only admin can create events' });
  }

  const eventId = (id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event-' + Date.now());

  if (events.has(eventId)) {
    return res.status(400).json({ error: 'Event ID already exists' });
  }

  const newEvent = {
    id: eventId,
    title,
    description: description || '',
    createdBy: userEmail,
    createdAt: new Date().toISOString()
  };

  events.set(eventId, newEvent);

  // Ensure directory Events/{eventId} exists
  const eventDir = path.join(__dirname, 'Events', eventId);
  fs.mkdirSync(eventDir, { recursive: true });

  res.status(201).json(newEvent);
});

// Upload image endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const { eventId, userEmail, userName } = req.body;
  if (!eventId || !userEmail) {
    return res.status(400).json({ error: 'eventId and userEmail are required' });
  }

  const cleanUserEmail = userEmail.trim().toLowerCase();
  const displayName = userName ? userName.trim() : cleanUserEmail.split('@')[0];
  const relativePath = `Events/${eventId}/${cleanUserEmail}/${req.file.filename}`;

  // Log/update user email to name mapping in Events/{eventId}/users.json
  try {
    const eventDir = path.join(__dirname, 'Events', eventId);
    fs.mkdirSync(eventDir, { recursive: true });
    const usersJsonPath = path.join(eventDir, 'users.json');
    let usersData = {};

    if (fs.existsSync(usersJsonPath)) {
      try {
        usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
      } catch (e) {
        usersData = {};
      }
    }

    usersData[cleanUserEmail] = displayName;
    fs.writeFileSync(usersJsonPath, JSON.stringify(usersData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to log user name in users.json:', err);
  }

  res.status(201).json({
    message: 'Image uploaded successfully',
    path: relativePath,
    url: `/${relativePath}`,
    filename: req.file.filename,
    eventId,
    userEmail: cleanUserEmail,
    userName: displayName
  });
}, (err, req, res, next) => {
  if (err) {
    res.status(400).json({ error: err.message });
  } else {
    next();
  }
});

// Get images for event
// ⚡ Performance Optimization: Converted synchronous disk I/O (fs.readdirSync, fs.statSync, fs.readFileSync)
// to async non-blocking fs.promises with Promise.all parallelization. Prevents event loop blocking during frequent gallery polling.
app.get('/api/events/:eventId/images', async (req, res) => {
  const eventId = req.params.eventId;
  const eventDir = getSafeEventDir(eventId);

  if (!eventDir) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    try {
      await fs.promises.access(eventDir);
    } catch {
      return res.json([]);
    }

    const userDirs = await fs.promises.readdir(eventDir, { withFileTypes: true });

    // Read users.json concurrently if present to attach user names
    let usersData = {};
    const usersJsonPath = path.join(eventDir, 'users.json');
    try {
      const usersRaw = await fs.promises.readFile(usersJsonPath, 'utf8');
      usersData = JSON.parse(usersRaw);
    } catch (e) {
      usersData = {};
    }

    // Process all user directories and file stat calls concurrently via Promise.all
    const userPromises = userDirs
      .filter(userDir => userDir.isDirectory())
      .map(async (userDir) => {
        const userEmail = userDir.name;
        const userDirPath = path.join(eventDir, userEmail);

        try {
          const files = await fs.promises.readdir(userDirPath, { withFileTypes: true });
          const filePromises = files
            .filter(file => file.isFile() && !file.name.startsWith('.'))
            .map(async (file) => {
              const filePath = path.join(userDirPath, file.name);
              const relativePath = `Events/${eventId}/${userEmail}/${file.name}`;
              const stats = await fs.promises.stat(filePath);

              return {
                filename: file.name,
                userEmail,
                eventId,
                url: `/${relativePath}`,
                path: relativePath,
                createdAt: stats.birthtime || stats.mtime,
                userName: usersData[userEmail] || userEmail.split('@')[0]
              };
            });

          return await Promise.all(filePromises);
        } catch {
          return [];
        }
      });

    const userResults = await Promise.all(userPromises);
    const images = userResults.flat();

    // Sort newest first
    images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve images', details: err.message });
  }
});

// Serve static files from root
app.use(express.static(path.join(__dirname)));
app.use('/Events', express.static(path.join(__dirname, 'Events')));

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
