# Carrera Music

A mobile-first iOS PWA music player backed by YouTube, with playlist management and cross-device persistence via Supabase.

---

## Features

- **YouTube search** — search for any song or artist using the YouTube Data API
- **Full-screen player** — large artwork, progress bar with seek, prev/play/pause/next controls
- **Mini player bar** — persistent now-playing bar with time display; tap track info to open full player
- **Queue** — play a full search result list as a queue with auto-advance
- **Playlists** — create, rename, delete playlists; add/remove tracks with a `+` / `✓` toggle on every track
- **Library** — browse your saved playlists
- **Persistent storage** — playlists sync to Supabase Postgres; anonymous sign-in on first load (no login required)
- **Cross-device sync** — playlists follow your anonymous session (Phase 2 will add full auth)
- **Recent searches** — last 6 searches saved locally for quick re-use
- **iOS safe-area** — respects notch and home indicator on all iPhone models
- **PWA** — installable on iOS home screen, runs full-screen with a custom equalizer icon

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 18 + Vite 5 | Vite 5 used (Node 22.1.0 incompatible with Vite 8+) |
| Styling | Plain CSS | No UI framework; mobile-first, dark theme |
| Music | YouTube IFrame API | Search via YouTube Data API v3 |
| Auth | Supabase Auth (anonymous) | Persistent anonymous session; upgrade path to email/Google |
| Database | Supabase Postgres | Playlists + tracks with Row-Level Security |
| Client SDK | `@supabase/supabase-js` | Browser-side, safe with RLS |
| Hosting | Vercel | Static deploy + env var management |
| PWA | Vite PWA manifest | Custom equalizer icon, iOS meta tags |

---

## Project structure

```
src/
  components/
    AddToPlaylistBtn.jsx   + / ✓ toggle for adding tracks to playlists
    BottomNav.jsx          3-tab nav: Search | Player | Library
    PlayerBar.jsx          Mini now-playing bar (hidden in PlayerView)
    ResumeOverlay.jsx      "Tap to resume" after iOS lock-screen pause
    TrackItem.jsx          Single track row used in search + playlists
  context/
    AuthContext.jsx        Supabase anonymous sign-in, exposes user/loading
    PlayerContext.jsx      YouTube IFrame player state + queue management
    PlaylistContext.jsx    Playlist CRUD — optimistic local + Supabase sync
  lib/
    supabase.js            Supabase client singleton
  providers/
    youtubeProvider.js     YouTube Data API search, in-memory cache, error handling
    index.js               Provider registry
    types.js               PROVIDERS enum
  views/
    LibraryView.jsx        Playlist list + create form
    PlayerView.jsx         Full-screen now-playing view
    PlaylistView.jsx       Tracks inside a playlist
    SearchView.jsx         Search bar, results, recent searches, skeletons
  App.jsx                  Root shell, view routing, always-mounted tab views
public/
  icon-192.png             PWA icon (equalizer bars design)
  icon-512.png
  manifest.json
scripts/
  generate-icons.mjs       Pure Node.js PNG icon generator (no deps)
```

---

## Getting started

### Prerequisites

- Node ≥ 18 (tested on 22.1.0)
- A [YouTube Data API v3](https://console.developers.google.com) key with your domain allowlisted
- A [Supabase](https://supabase.com) project with the schema below

### Environment variables

Create a `.env` file in the project root:

```env
VITE_YOUTUBE_API_KEY=your_youtube_data_api_v3_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

All `VITE_` prefixed vars are exposed to the browser. Supabase Row-Level Security ensures users can only access their own data.

### Supabase schema

Run the following in the Supabase SQL Editor:

```sql
create table playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

create table playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references playlists(id) on delete cascade not null,
  track_id text not null,
  title text not null,
  artist text,
  thumbnail text,
  thumbnail_medium text,
  duration integer,
  position integer not null,
  added_at timestamptz default now()
);

create index on playlists(user_id);
create index on playlist_tracks(playlist_id, position);

alter table playlists enable row level security;
alter table playlist_tracks enable row level security;

create policy "users manage own playlists"
  on playlists for all using (auth.uid() = user_id);

create policy "users manage own tracks"
  on playlist_tracks for all using (
    playlist_id in (select id from playlists where user_id = auth.uid())
  );
```

Also enable **Anonymous sign-in** under Authentication → Configuration → Providers.

### Run locally

```bash
npm install
npm run dev
```

### Deploy to Vercel

```bash
# Add env vars (first time only)
vercel env add VITE_YOUTUBE_API_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Build + deploy
vercel build --prod --yes
vercel --prebuilt --prod
```

---

## Known limitations

- **Lock-screen playback** — YouTube IFrame API is suspended by iOS when the screen locks. A "Tap to Resume" overlay appears when returning to the app. Full lock-screen audio requires a provider with direct stream URLs. See `FINDINGS.md` for full analysis.
- **Cross-device sync** — currently tied to the anonymous Supabase session per browser. Full cross-device sync requires email/Google sign-in (planned Phase 2).
- **YouTube API quota** — the Data API has a daily quota. Searches are cached in-memory per session to reduce calls.

---

## Branches

| Branch | Description |
|---|---|
| `phase-a-spike` | YouTube IFrame + Data API feasibility spike |
| `phase-b-mvp` | Full YouTube MVP with playlists and localStorage |
| `phase-c-audius` | Audius spike — lock-screen audio confirmed, catalog unsuitable |
| `phase-e-polish` | **Current** — polished YouTube MVP + PlayerView + Supabase persistence |

---

## Testing

```bash
npm test              # run all tests once
npm run test:watch    # watch mode (re-runs on file change)
npm run test:coverage # generate coverage report
```

### What is covered

| File | Type | Tests |
|---|---|---|
| `src/__tests__/utils.test.js` | Unit | `formatDuration`, `fmt`, `loadRecent`, `saveRecent` |
| `src/__tests__/reducer.test.js` | Unit | PlaylistContext reducer — all 7 action types |
| `src/components/AddToPlaylistBtn.test.jsx` | Component | +/✓ toggle, dropdown, add/remove flow |
| `src/components/BottomNav.test.jsx` | Component | 3 tabs, active state, playing dot, navigation |
| `src/components/PlayerBar.test.jsx` | Component | Null guard, track info, play/pause, prev/next |
| `src/context/PlaylistContext.test.jsx` | Integration | CRUD, isTrackSaved, removeTrackFromAll, localStorage |

### Pre-push hook
Husky runs `npm test` automatically before every `git push`. A failed test suite will abort the push.

### CI
GitHub Actions runs lint + tests on every push and pull request (see `.github/workflows/ci.yml`).
