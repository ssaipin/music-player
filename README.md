# 🎵 Tape Player

A retro pixel art cassette music player built with React + Spotify Web API.

## Features
- 🎨 Custom pixel art cassette tape design
- 🎵 Full Spotify playback (requires Premium)
- 🔍 Search any artist or song
- ▶ Play, pause, skip controls
- 📊 Progress bar with seek
- 🔊 Volume control

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your tape art assets
Place these files in the `/public` folder:
- `Tape_1.png` — idle/paused state
- `IMG_0001.GIF` — playing state animation

### 3. Run locally
```bash
npm run dev
```
Visit `http://127.0.0.1:5173`

### 4. Build for production
```bash
npm run build
```

### 5. Deploy to Netlify
Push to GitHub — Netlify auto-deploys on every push.

**Build settings in Netlify:**
- Build command: `npm run build`
- Publish directory: `dist`

## Spotify Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Add your Netlify URL as Redirect URI
4. Copy your Client ID into `src/spotify.js`

## Tech Stack
- React 18 + Vite
- Spotify Web Playback SDK
- Spotify Web API
- CSS Modules
- Press Start 2P font (pixel art)
