# OPML Podcast Profile App

Create a public, shareable podcast profile from your OPML podcast subscription file. Users can upload their OPML, customize their profile (name, Gravatar), and share a visual, mobile-friendly profile page with podcast artwork, cadence analysis, and subscribe links.

## Features
- Upload OPML file to extract and display all podcasts
- Visual profile with podcast artwork thumbnails
- Add first name, last name, and Gravatar (by email)
- Responsive, mobile-friendly UI (Chakra UI)
- Shareable profile URL and native share button
- Podcast cadence analysis and subscribe links

## Getting Started

### 1. Install dependencies

#### Backend
```
npm install
```

#### Frontend
```
cd client
npm install
```

### 2. Run the app

#### Start backend (from project root):
```
node server.js
```

#### Start frontend (in another terminal):
```
cd client
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## Project Structure
- `server.js` - Express backend (OPML upload, podcast processing)
- `client/` - React frontend (Chakra UI, profile UI)

---

## To Do
- Implement OPML parsing and podcast enrichment
- Profile customization and sharing
- Podcast cadence analysis

## Future Ideas

### Screenshot-based import ("AI scraping")
For apps with no OPML export (Apple Podcasts, Spotify), let users upload a
screenshot of their subscriptions/library instead of hunting for a file.

- User uploads one or more screenshots of their podcast app's subscription list.
- Send the image(s) to Claude (vision) — the Anthropic client and
  `ANTHROPIC_API_KEY` are already wired up in `server.js` for the personality
  endpoint, so this would reuse that setup — and have it read off the show
  titles.
- Fuzzy-match each extracted title against Apple's free, unauthenticated
  iTunes Search API to resolve a real RSS feed URL (many titles won't match
  cleanly, so this needs a review/edit step before saving, not a silent
  auto-import).
- Sidesteps the fact that neither Apple nor Spotify offer a public,
  unauthenticated way to read a user's subscriptions — no OAuth app
  registration, no App Review, no user cap to work around.

Parked for now — not started. Revisit if there's appetite for it.

### Spotify "Connect" OAuth (partially explored, blocked on quota)
Spotify's Web API has a real `GET /me/shows` endpoint for a user's followed
podcasts via OAuth, so a "Connect with Spotify" button is technically
buildable. Caveats if picked up later:
- Apps in Development Mode are capped at 5 authenticated users; going past
  that requires Spotify's Extended Quota Mode review, which (as of May 2025)
  only accepts applications from organizations, not individuals.
- The API returns Spotify's own show metadata, not RSS feed URLs — many
  Spotify Originals have no public feed at all, so results would need the
  same iTunes Search API fuzzy-matching step as above, with partial-match
  gaps expected.