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