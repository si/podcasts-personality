const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OPMLParser = require('opmlparser');

const app = express();

// CORS: open in development, restricted in production via ALLOWED_ORIGINS env var
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false)
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.originalname.match(/\.(opml|xml)$/i) ||
      ['text/xml', 'application/xml', 'text/x-opml'].includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only OPML/XML files are allowed'));
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// OPML upload endpoint
app.post('/api/upload-opml', (req, res, next) => {
  upload.single('opml')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const podcasts = [];

  const cleanup = () => {
    try { fs.unlinkSync(filePath); } catch (_) {}
  };

  const stream = fs.createReadStream(filePath);
  const opmlparser = new OPMLParser();

  stream.pipe(opmlparser)
    .on('error', (err) => {
      cleanup();
      res.status(500).json({ error: 'Failed to parse OPML', details: err.message });
    })
    .on('readable', function () {
      let outline;
      while ((outline = this.read())) {
        if (outline.xmlurl) {
          podcasts.push({
            title: outline.title || outline.text || '',
            xmlurl: outline.xmlurl
          });
        }
      }
    })
    .on('end', () => {
      cleanup();
      res.json({ podcasts });
    });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
