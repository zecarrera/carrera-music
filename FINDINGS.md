# Phase A Findings: iOS Playback Feasibility Spike

**Tested on:** iPhone / iOS Safari  
**Deployment:** https://carrera-music.vercel.app

---

## Approach 1: YouTube IFrame API

**How it works:** Official YouTube IFrame API (`youtube.com/iframe_api`). Programmatic control via `YT.Player` instance. No YouTube account or API key required.

| Test | Result |
|------|--------|
| Playback initiation (user tap) | ✅ Works |
| Play / Pause controls | ✅ Works |
| Seek | ✅ Works |
| Prev / Next track | ✅ Works |
| Phone locked while playing | ❌ Pauses immediately |
| Tab backgrounded | ❌ Pauses |
| Resume after returning to tab | ✅ Resumes cleanly on tap |
| Media Session API (lock screen controls) | ⚠️ Registered but irrelevant — audio is already paused by iOS |

---

## Approach 2: YouTube Data API + IFrame Embed

**How it works:** YouTube Data API v3 for search and track metadata (title, channel, thumbnail). IFrame embed for actual playback (same mechanism as Approach 1). Requires API key.

| Test | Result |
|------|--------|
| Track metadata (title, channel, thumbnail) | ✅ Works |
| Search | ✅ Works (requires API key with correct referrer allowlist) |
| Playback initiation (user tap) | ✅ Works |
| Play / Pause / Seek / Prev / Next | ✅ Works |
| Phone locked while playing | ❌ Pauses immediately |
| Tab backgrounded | ❌ Pauses |
| Resume after returning to tab | ✅ Resumes cleanly on tap |

**API key note:** Key must include production domain in HTTP referrer allowlist (e.g. `https://carrera-music.vercel.app/*`). Localhost-only keys will 403 in production.

---

## Root Cause: Lock Screen Behavior

Both approaches ultimately embed a YouTube IFrame. iOS Safari treats iframes as web content, not as an audio session. When the screen locks or the browser is backgrounded, iOS suspends the iframe entirely — audio stops.

The `navigator.mediaSession` API was implemented but cannot prevent this: Media Session controls only surface on the lock screen if audio is actively playing through a native `<audio>`/`<video>` element. An iframe suspension bypasses this.

This is consistent with the Non-Goal stated in the initial concept: *"Guaranteed background or lock-screen playback across all iOS versions and browser states."*

---

## Comparison Summary

| | IFrame API | Data API + IFrame |
|---|---|---|
| API key required | No | Yes |
| Search capability | No (hardcoded IDs only) | Yes |
| Rich metadata (thumbnail, channel) | No | Yes |
| Lock screen playback | ❌ | ❌ |
| Background playback | ❌ | ❌ |
| Implementation complexity | Low | Medium |

---

## Recommendation for Phase B

**Use both in combination:**

- **YouTube Data API** for search, track metadata, and thumbnails — this is what enables users to find and add tracks to playlists.
- **YouTube IFrame API** for all playback — simpler, no key needed for playback itself, full programmatic control.

**Lock screen / background handling:**
- Accept the limitation for MVP (already a stated Non-Goal).
- Implement the clear resume UX path: when the user returns to the app and audio is paused, display a prominent "Tap to resume" prompt using the player state change event (`onStateChange` → `paused`).
- Log a follow-up spike for Phase D: evaluate whether a silent native `<audio>` keep-alive trick can maintain the iOS audio session while the YouTube IFrame plays. This is non-trivial and has reliability concerns across iOS versions.

---

## Decision Gate: Go for Phase B ✅

- YouTube IFrame API works reliably on iOS Safari for in-app playback. ✅
- YouTube Data API enables search and rich metadata. ✅
- Lock screen limitation is accepted per Non-Goals for MVP. ✅
- Recommended architecture is clear: Data API for search + IFrame API for playback. ✅

---

## Lock-Screen Alternatives Analysis (Post-MVP)

Lock-screen playback was re-evaluated as a must-have for the final product. The following options were researched.

### Root Technical Requirement

iOS Safari only keeps audio playing when the screen is locked if it is driven by a native **HTML5 `<audio>` element**. Iframes (including YouTube embeds) are fully suspended by iOS on lock. The `navigator.mediaSession` API provides lock-screen controls but cannot prevent iframe suspension — it only works when a native `<audio>` element is actively playing.

### Options Evaluated

| Option | Lock-Screen | Catalog | User Subscription Required | Viable? |
|--------|-------------|---------|---------------------------|---------|
| YouTube IFrame API | ❌ | Huge | No | MVP only |
| Spotify Web Playback SDK | ❌ | 70M+ | Yes (Premium) | No — officially unsupported on iOS Safari |
| Deezer Web SDK | ❌ | 70M+ | Yes | No — no iOS Safari support |
| Apple MusicKit JS | ✅ | 100M+ | Yes (Apple Music) | Yes — but narrows user base |
| SoundCloud API + `<audio>` | ✅ | 300M+ | No | Yes — best fit for final product |
| Self-hosted audio + `<audio>` | ✅ | Self-hosted | No | Yes — requires content licensing |
| Bandcamp API + `<audio>` | ✅ | Millions (indie) | No | Yes — indie-focused niche |

### Recommendation for Final Product

**SoundCloud as primary source.** The SoundCloud API returns direct streamable audio URLs which can be played via `<audio>`, unlocking full iOS lock-screen and background playback. No user subscription required. 300M+ track catalog including both major and independent artists.

**Implementation path:**
1. SoundCloud API for track search and metadata.
2. Stream URL fetched per track, played via native `<audio>`.
3. `navigator.mediaSession` registers lock-screen controls (play, pause, next, prev, seek).
4. PWA manifest updated with `"categories": ["music"]`.

**Key risk:** SoundCloud API requires developer approval and has had access policy changes historically. A thin backend proxy may be needed to attach the API key server-side (avoiding client-side key exposure) and handle stream URL redirects.

**Apple MusicKit JS** is a strong secondary option for users with Apple Music subscriptions — native iOS playback, massive catalog, full lock-screen support. Worth adding as an optional premium source in Phase E.

### MVP Decision

Lock-screen limitation is **accepted for the MVP** (Phase B/C) and will be revisited in Phase E when SoundCloud integration is evaluated. The provider abstraction layer built in Phase C will allow swapping or layering sources without rewriting player and playlist logic.

---

## Phase C Findings: Audius + Native Audio — Lock-Screen Playback ✅

**Branch:** `phase-c-audius`  
**Deployment:** https://carrera-music.vercel.app  
**Tested on:** iPhone / iOS Safari

### Approach

- **Audius API** for search and track metadata (`/v1/tracks/search`)
- **Direct stream URL** per track (`/v1/tracks/{id}/stream`)
- **Native HTML5 `<audio>` element** for playback (no iframe)
- **Media Session API** for lock-screen controls (play, pause, next, prev)

### Test Results

| Test | Result |
|------|--------|
| Track search | ✅ Works — no API key required |
| Playback initiation (user tap) | ✅ Works |
| Play / Pause / Seek / Prev / Next | ✅ Works |
| **Phone locked while playing** | ✅ **Audio continues** |
| **Tab backgrounded (switch apps)** | ✅ **Audio continues** |
| Lock-screen controls (Media Session) | ✅ Play/pause/skip visible on lock screen |
| Resume after returning to tab | ✅ Clean |

### Root Cause Confirmed

The YouTube iframe was the blocker — iOS suspends iframes on lock. Native `<audio>` is treated as a proper audio session by iOS and continues playing. Media Session API successfully surfaces controls on the lock screen.

### Audius Catalog Notes

- Catalog is indie/electronic/hip-hop focused. Mainstream pop/rock may have limited coverage.
- No API key, no account, no approval required — just include `app_name` query param.
- Decentralized network: host is resolved dynamically from `https://api.audius.co`.

### Decision: Phase C is the MVP ✅

Audius + native `<audio>` solves the lock-screen requirement. The existing app architecture (search → playlists → player) carries forward unchanged. Phase C branch (`phase-c-audius`) is now the primary development branch.

**Next:** Phase D — optional account sync and cloud persistence.
