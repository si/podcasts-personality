const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const OPMLParser = require('opmlparser');
const { Pool } = require('pg');
const { XMLParser } = require('fast-xml-parser');
const Anthropic = require('@anthropic-ai/sdk');

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

// PostgreSQL-backed profile storage.
// Railway injects DATABASE_URL automatically when a Postgres service is added to the project.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      hash       TEXT PRIMARY KEY,
      name       TEXT,
      podcasts   TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS podcast_cache (
      xmlurl               TEXT PRIMARY KEY,
      description          TEXT,
      artwork              TEXT,
      categories           TEXT,
      latest_episode_title TEXT,
      latest_episode_date  TEXT,
      frequency            TEXT,
      fetched_at           TEXT NOT NULL,
      website_url          TEXT
    )
  `);
}

// Validate hash to prevent path traversal / SQL injection via param
function isValidHash(hash) {
  return typeof hash === 'string' && /^[A-Za-z0-9_-]{8}$/.test(hash);
}

function generateHash() {
  return crypto.randomBytes(6).toString('base64url');
}

async function hashExists(hash) {
  const { rows } = await pool.query('SELECT 1 FROM profiles WHERE hash = $1', [hash]);
  return rows.length > 0;
}

async function saveProfile(hash, podcasts) {
  await pool.query(
    'INSERT INTO profiles (hash, podcasts, created_at) VALUES ($1, $2, $3)',
    [hash, JSON.stringify(podcasts), new Date().toISOString()]
  );
}

async function loadProfile(hash) {
  if (!isValidHash(hash)) return null;
  const { rows } = await pool.query('SELECT * FROM profiles WHERE hash = $1', [hash]);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    hash: row.hash,
    name: row.name || null,
    podcasts: JSON.parse(row.podcasts),
    created_at: row.created_at,
  };
}

async function updateProfileName(hash, name) {
  const { rowCount } = await pool.query(
    'UPDATE profiles SET name = $1 WHERE hash = $2',
    [name, hash]
  );
  return rowCount > 0;
}

// ---- Podcast metadata cache ----

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedPodcast(xmlurl) {
  const { rows } = await pool.query('SELECT * FROM podcast_cache WHERE xmlurl = $1', [xmlurl]);
  return rows[0] || null;
}

async function savePodcastCache(data) {
  await pool.query(`
    INSERT INTO podcast_cache
      (xmlurl, description, artwork, categories,
       latest_episode_title, latest_episode_date, frequency, website_url, fetched_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (xmlurl) DO UPDATE SET
      description          = EXCLUDED.description,
      artwork              = EXCLUDED.artwork,
      categories           = EXCLUDED.categories,
      latest_episode_title = EXCLUDED.latest_episode_title,
      latest_episode_date  = EXCLUDED.latest_episode_date,
      frequency            = EXCLUDED.frequency,
      website_url          = EXCLUDED.website_url,
      fetched_at           = EXCLUDED.fetched_at
  `, [
    data.xmlurl, data.description, data.artwork, data.categories,
    data.latest_episode_title, data.latest_episode_date, data.frequency, data.website_url, data.fetched_at
  ]);
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
  const cached = await getCachedPodcast(xmlurl);
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

  // Website URL
  let websiteUrl = '';
  if (channel.link) {
    if (typeof channel.link === 'string') {
      websiteUrl = channel.link;
    } else if (Array.isArray(channel.link)) {
      const altLink = channel.link.find(l => l['@_rel'] === 'alternate' || !l['@_rel']);
      websiteUrl = altLink?.['@_href'] || channel.link[0]?.['@_href'] || '';
    } else if (typeof channel.link === 'object') {
      websiteUrl = channel.link['@_href'] || channel.link['#text'] || '';
    }
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
    website_url: websiteUrl,
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
    websiteUrl: metadata.website_url || null,
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
app.post('/api/profiles', async (req, res) => {
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
  } while (await hashExists(hash) && attempts < 5);

  try {
    await saveProfile(hash, podcasts);
    res.json({ hash });
  } catch (err) {
    console.error('Failed to save profile:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Retrieve a profile by hash
app.get('/api/profiles/:hash', async (req, res) => {
  const { hash } = req.params;
  const profile = await loadProfile(hash);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

// Update a profile's name
app.patch('/api/profiles/:hash', async (req, res) => {
  const { hash } = req.params;
  if (!isValidHash(hash)) {
    return res.status(400).json({ error: 'Invalid profile id' });
  }

  const { name } = req.body;
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  const trimmed = name.trim().slice(0, 100);
  const updated = await updateProfileName(hash, trimmed);
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
    const cached = await getCachedPodcast(url);
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

// Personality analysis endpoint — uses Claude to derive Big Five traits from podcast categories
const PERSONALITY_SYSTEM_PROMPT = `You are an expert personality psychologist who analyses media consumption patterns to infer personality profiles. You apply the Big Five (OCEAN) personality model and Uses-and-Gratifications theory to provide accurate, nuanced insights based on podcast listening habits.

Your analysis is always:
- Evidence-based and grounded in media-psychology research
- Specific and insightful, never generic
- Balanced and non-judgmental
- Probabilistic — patterns suggest tendencies, not certainties

Respond with valid JSON only. No markdown, no explanations outside the JSON.`;

app.post('/api/personality', async (req, res) => {
  const { podcastSummary } = req.body;
  if (!Array.isArray(podcastSummary) || podcastSummary.length === 0) {
    return res.status(400).json({ error: 'podcastSummary must be a non-empty array' });
  }

  // Sanitise input
  const summary = podcastSummary
    .filter(p => p && typeof p.title === 'string')
    .slice(0, 200)
    .map(p => ({
      title: String(p.title).slice(0, 200),
      categories: Array.isArray(p.categories) ? p.categories.slice(0, 5).map(c => String(c).slice(0, 80)) : [],
      frequency: typeof p.frequency === 'string' ? p.frequency : 'unknown',
    }));

  if (summary.length === 0) {
    return res.status(400).json({ error: 'No valid podcast data provided' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build concise summary for the prompt
    const categoryCounts = {};
    for (const p of summary) {
      for (const cat of p.categories) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([cat, count]) => `${cat} (${Math.round(count / summary.length * 100)}%)`)
      .join(', ');

    const freqCounts = {};
    for (const p of summary) {
      freqCounts[p.frequency] = (freqCounts[p.frequency] || 0) + 1;
    }
    const freqSummary = Object.entries(freqCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `${n} ${f}`)
      .join(', ');

    const titles = summary.slice(0, 30).map(p => p.title).filter(Boolean).join(', ');

    const userPrompt = `Analyse this podcast listening profile:
Total podcasts: ${summary.length}
Top categories (% of library): ${topCategories || 'uncategorised'}
Publishing frequency breakdown: ${freqSummary}
Sample podcast titles: ${titles}

Return a JSON object with this exact structure:
{
  "archetype": "2-4 word evocative title, e.g. 'The Analytical Explorer'",
  "summary": "2-3 sentences describing personality inferred from listening choices",
  "traits": {
    "openness": <integer 0-100>,
    "conscientiousness": <integer 0-100>,
    "extraversion": <integer 0-100>,
    "agreeableness": <integer 0-100>,
    "neuroticism": <integer 0-100>
  },
  "traitNotes": {
    "openness": "one sentence explaining this score",
    "conscientiousness": "one sentence explaining this score",
    "extraversion": "one sentence explaining this score",
    "agreeableness": "one sentence explaining this score",
    "neuroticism": "one sentence explaining this score"
  },
  "interests": ["interest 1", "interest 2", "interest 3", "interest 4", "interest 5"],
  "listeningStyle": "one sentence about how they engage with podcast content"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: PERSONALITY_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0]?.text || '';
    let personality;
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim();
      personality = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]+\}/);
      if (match) personality = JSON.parse(match[0]);
      else throw new Error('Could not parse AI response as JSON');
    }

    res.json({ personality });
  } catch (err) {
    console.error('Personality analysis failed:', err.message);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(clientBuildPath));

  // Inject dynamic OpenGraph tags for shareable profile pages
  app.get('/p/:hash', async (req, res) => {
    const { hash } = req.params;
    const profile = await loadProfile(hash);
    const indexPath = path.join(clientBuildPath, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    let title = 'Podcast Personality';
    let description = 'Discover what your podcast subscriptions say about your personality.';

    if (profile) {
      const displayName = profile.name ? profile.name : 'Someone';
      const podcastCount = profile.podcasts.length;
      title = profile.name ? `${profile.name}'s Podcast Profile` : 'A Podcast Personality Profile';
      description = `${displayName} listens to ${podcastCount} podcast${podcastCount !== 1 ? 's' : ''}. See their personality profile and what their listening taste reveals about them.`;
    }

    const escape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const injected = html.replace(
      '<meta property="og:title" content="Podcast Personality" />',
      `<meta property="og:title" content="${escape(title)}" />\n    <meta property="og:description" content="${escape(description)}" />`,
    ).replace(
      '<meta property="og:description" content="Discover what your podcast subscriptions say about your personality." />',
      '',
    ).replace(
      '<meta name="description" content="Discover what your podcast subscriptions say about your personality. Upload your OPML and get an instant profile." />',
      `<meta name="description" content="${escape(description)}" />`,
    ).replace(
      '<title>Podcast Personality</title>',
      `<title>${escape(title)}</title>`,
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(injected);
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
