const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const OPMLParser = require('opmlparser');
const Database = require('better-sqlite3');
const { XMLParser } = require('fast-xml-parser');

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

// SQLite-backed profile storage.
// Set DATA_DIR env var to a persistent volume path on Railway so the DB survives redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let _db;
function getDb() {
  if (!_db) {
    ensureDataDir();
    _db = new Database(path.join(DATA_DIR, 'profiles.db'));
    _db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        hash       TEXT PRIMARY KEY,
        name       TEXT,
        podcasts   TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS podcast_cache (
        xmlurl               TEXT PRIMARY KEY,
        description          TEXT,
        artwork              TEXT,
        categories           TEXT,
        latest_episode_title TEXT,
        latest_episode_date  TEXT,
        frequency            TEXT,
        fetched_at           TEXT NOT NULL
      )
    `);
  }
  return _db;
}

// Validate hash to prevent path traversal / SQL injection via param
function isValidHash(hash) {
  return typeof hash === 'string' && /^[A-Za-z0-9_-]{8}$/.test(hash);
}

function generateHash() {
  return crypto.randomBytes(6).toString('base64url');
}

function hashExists(hash) {
  return !!getDb().prepare('SELECT 1 FROM profiles WHERE hash = ?').get(hash);
}

function saveProfile(hash, podcasts) {
  getDb()
    .prepare('INSERT INTO profiles (hash, podcasts, created_at) VALUES (?, ?, ?)')
    .run(hash, JSON.stringify(podcasts), new Date().toISOString());
}

function loadProfile(hash) {
  if (!isValidHash(hash)) return null;
  const row = getDb().prepare('SELECT * FROM profiles WHERE hash = ?').get(hash);
  if (!row) return null;
  return {
    hash: row.hash,
    name: row.name || null,
    podcasts: JSON.parse(row.podcasts),
    created_at: row.created_at,
  };
}

function updateProfileName(hash, name) {
  const result = getDb()
    .prepare('UPDATE profiles SET name = ? WHERE hash = ?')
    .run(name, hash);
  return result.changes > 0;
}

// ---- Podcast metadata cache ----

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedPodcast(xmlurl) {
  return getDb().prepare('SELECT * FROM podcast_cache WHERE xmlurl = ?').get(xmlurl) || null;
}

function savePodcastCache(data) {
  getDb().prepare(`
    INSERT OR REPLACE INTO podcast_cache
      (xmlurl, description, artwork, categories,
       latest_episode_title, latest_episode_date, frequency, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.xmlurl, data.description, data.artwork, data.categories,
    data.latest_episode_title, data.latest_episode_date, data.frequency, data.fetched_at
  );
}

function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateFrequency(episodes) {
  if (episodes.length < 2) return 'unknown';
  const recent = episodes.slice(0, Math.min(6, episodes.length));
  const gaps = [];
  for (let i = 0; i < recent.length - 1; i++) {
    const gap = (recent[i].date - recent[i + 1].date) / (1000 * 60 * 60 * 24);
    if (gap >= 0) gaps.push(gap);
  }
  if (gaps.length === 0) return 'unknown';
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avgGap < 1.5) return 'daily';
  if (avgGap < 8) return 'weekly';
  if (avgGap < 16) return 'biweekly';
  if (avgGap < 35) return 'monthly';
  if (avgGap < 90) return 'occasional';
  return 'dormant';
}

function extractText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val['#text'] || val.__cdata || '';
  return String(val);
}

async function fetchPodcastMetadata(xmlurl) {
  // Return from cache if still fresh
  const cached = getCachedPodcast(xmlurl);
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return { ...cached, categories: JSON.parse(cached.categories || '[]') };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let xml;
  try {
    const response = await fetch(xmlurl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PodcastPersonality/1.0' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    xml = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
    isArray: (name) => ['item', 'entry', 'itunes:category', 'category'].includes(name),
  });

  const result = parser.parse(xml);
  const channel = result?.rss?.channel || result?.feed;
  if (!channel) throw new Error('No channel found in feed');

  // Description
  const rawDesc = channel['itunes:summary'] || channel.description || channel.subtitle || '';
  const description = stripHtml(extractText(rawDesc)).slice(0, 500);

  // Artwork
  let artwork = '';
  if (channel['itunes:image']?.['@_href']) {
    artwork = channel['itunes:image']['@_href'];
  } else if (channel.image?.url) {
    artwork = extractText(channel.image.url);
  }

  // Categories
  const categories = [];
  const itunesCats = channel['itunes:category'];
  if (Array.isArray(itunesCats)) {
    itunesCats.forEach(c => { if (c['@_text']) categories.push(c['@_text']); });
  } else if (itunesCats?.['@_text']) {
    categories.push(itunesCats['@_text']);
  }

  // Episodes (RSS <item> or Atom <entry>)
  const rawItems = channel.item || channel.entry || [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const episodes = items
    .map(item => ({
      title: extractText(item.title),
      date: item.pubDate ? new Date(item.pubDate) : (item.updated ? new Date(item.updated) : null),
    }))
    .filter(ep => ep.date && !isNaN(ep.date.getTime()))
    .sort((a, b) => b.date - a.date);

  const latestEpisodeTitle = episodes[0]?.title || null;
  const latestEpisodeDate = episodes[0]?.date?.toISOString() || null;
  const frequency = calculateFrequency(episodes);

  const metadata = {
    xmlurl,
    description,
    artwork,
    categories: JSON.stringify(categories),
    latest_episode_title: latestEpisodeTitle,
    latest_episode_date: latestEpisodeDate,
    frequency,
    fetched_at: new Date().toISOString(),
  };

  try { savePodcastCache(metadata); } catch (e) { console.error('Cache save failed:', e.message); }

  return { ...metadata, categories };
}

function formatEnrichedMetadata(metadata) {
  return {
    description: metadata.description || null,
    artwork: metadata.artwork || null,
    categories: Array.isArray(metadata.categories)
      ? metadata.categories
      : JSON.parse(metadata.categories || '[]'),
    latestEpisode: {
      title: metadata.latest_episode_title || null,
      date: metadata.latest_episode_date || null,
    },
    frequency: metadata.frequency || null,
  };
}

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

// Save a podcast profile and return a shareable hash
app.post('/api/profiles', (req, res) => {
  const { podcasts } = req.body;
  if (!Array.isArray(podcasts) || podcasts.length === 0) {
    return res.status(400).json({ error: 'podcasts must be a non-empty array' });
  }

  // Generate a unique hash (retry on collision)
  let hash;
  let attempts = 0;
  do {
    hash = generateHash();
    attempts++;
  } while (hashExists(hash) && attempts < 5);

  try {
    saveProfile(hash, podcasts);
    res.json({ hash });
  } catch (err) {
    console.error('Failed to save profile:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Retrieve a profile by hash
app.get('/api/profiles/:hash', (req, res) => {
  const { hash } = req.params;
  const profile = loadProfile(hash);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

// Update a profile's name
app.patch('/api/profiles/:hash', (req, res) => {
  const { hash } = req.params;
  if (!isValidHash(hash)) {
    return res.status(400).json({ error: 'Invalid profile id' });
  }

  const { name } = req.body;
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  const trimmed = name.trim().slice(0, 100);
  const updated = updateProfileName(hash, trimmed);
  if (!updated) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({ name: trimmed });
});

// Enrich podcast metadata (with 24-hour cache per feed URL)
app.post('/api/podcasts/enrich', async (req, res) => {
  const { xmlurls } = req.body;
  if (!Array.isArray(xmlurls) || xmlurls.length === 0) {
    return res.status(400).json({ error: 'xmlurls must be a non-empty array' });
  }

  const urls = xmlurls.filter(u => typeof u === 'string').slice(0, 150);
  const results = {};

  // Return cached entries immediately; collect URLs that need live fetching
  const toFetch = [];
  for (const url of urls) {
    const cached = getCachedPodcast(url);
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
      results[url] = formatEnrichedMetadata(cached);
    } else {
      toFetch.push(url);
    }
  }

  // Fetch uncached feeds with limited concurrency (10 at a time)
  const CONCURRENCY = 10;
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map(async (url) => {
      try {
        const metadata = await fetchPodcastMetadata(url);
        results[url] = formatEnrichedMetadata(metadata);
      } catch (err) {
        console.error(`Enrich failed for ${url}:`, err.message);
        results[url] = null;
      }
    }));
  }

  res.json(results);
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
