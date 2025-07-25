const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OPMLParser = require('opmlparser');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// OPML upload endpoint (to be implemented)
app.post('/api/upload-opml', upload.single('opml'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const podcasts = [];
  const stream = fs.createReadStream(filePath);
  const opmlparser = new OPMLParser();

  stream.pipe(opmlparser)
    .on('error', (err) => {
      fs.unlinkSync(filePath);
      res.status(500).json({ error: 'Failed to parse OPML', details: err.message });
    })
    .on('readable', function() {
      let outline;
      while (outline = this.read()) {
        if (outline.xmlurl) {
          podcasts.push({
            title: outline.title || outline.text || '',
            xmlurl: outline.xmlurl
          });
        }
      }
    })
    .on('end', () => {
      fs.unlinkSync(filePath);
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});