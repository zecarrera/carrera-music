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
- Lock screen limitation is accepted per Non-Goals. ✅
- Recommended architecture is clear: Data API for search + IFrame API for playback. ✅
