## Initial Application Concept: iOS Mobile Web Music Player

### Vision
Build a mobile-first web application targeting the iOS ecosystem (Safari browser and installable web-app style usage) that allows users to play music and create custom playlists, while keeping infrastructure cost near zero during MVP and reducing data usage per session.

### Product Goals
- Enable music playback from mobile browser sessions on iPhone.
- Allow users to create, edit, reorder, and delete custom playlists.
- Support anonymous usage first, with optional account-based sync later.
- Deploy entirely on free-tier infrastructure for initial launch.
- Minimize bandwidth consumption without breaking core UX.

### Non-Goals for MVP
- Native iOS application.
- Guaranteed background or lock-screen playback across all iOS versions and browser states.
- Offline audio downloads.
- Social sharing and collaborative playlists.

### Target Users and Core Use Cases
- Listener opens app from iPhone Safari and starts playback quickly.
- Listener builds one or more personal playlists.
- Listener returns later and sees previously saved playlists (local first, optional cloud later).

### Platform Constraints and Playback Behavior
- Primary platform: iOS Safari mobile browser.
- Playback must start from a direct user interaction due to browser media policies.
- When device is locked or browser is backgrounded, playback continuity is best-effort and depends on iOS/browser behavior.
- If playback stops during lock/background transitions, the app must provide a clear resume path when user returns.

### Music Source Strategy
- Initial source strategy: YouTube-first.
- Integrate only via official APIs and approved embedding/access patterns.
- Implement provider abstraction so future sources can be added without rewriting playlist and player logic.
- If provider policies or technical constraints block UX goals, activate fallback roadmap to add secondary provider.

### Proposed Technical Architecture (MVP)
- Frontend: mobile-first SPA/PWA-style web client.
- Backend API: lightweight service hosted on Render free tier.
- Data layer options:
1. Option A: Neon (Postgres) for relational playlist modeling.
2. Option B: MongoDB Atlas for flexible document-first modeling.
- Media hosting: not required in MVP when relying on external provider content.
- API keys and secrets: managed server-side whenever possible.

### Data Model Outline
- GuestSession: local anonymous identity and local playlist ownership.
- User: optional authenticated identity.
- Playlist: id, owner, name, timestamps.
- PlaylistItem: playlistId, providerTrackRef, order index.
- ProviderTrackRef: source, external id, title, duration, thumbnail.
- PlaybackState: current track, queue source, position, last updated.

### Bandwidth Minimization Strategy
- Default to lower-cost playback options when provider supports quality controls.
- Avoid aggressive prefetching on cellular networks.
- Load lower-resolution thumbnails by default.
- Cache track metadata and playlist payloads to reduce repeated requests.
- Debounce search requests and avoid duplicate API calls.
- Track estimated MB used per active session as a product metric.

### Functional Requirements (MVP)
- Search and select tracks from configured provider.
- Playback controls: play, pause, next, previous, seek (if supported by provider mode).
- Playlist management: create, rename, delete, reorder playlists.
- Playlist items: add, remove, reorder tracks.
- Anonymous persistence: retain playlists locally across refreshes.
- Optional account flow: sign in and sync playlists to cloud.

### Non-Functional Requirements (MVP)
- Mobile-first responsiveness and one-hand usability.
- Acceptable startup and playback initiation time on typical mobile networks.
- Graceful degradation on provider/API failures and rate limits.
- Free-tier deployability with clear limits and monitoring.

### MVP Acceptance Criteria
- User can create a playlist and add at least 10 tracks.
- User can reorder playlist items and persist order.
- Anonymous playlists persist after browser refresh.
- Playback can be initiated reliably from user interaction.
- Lock/background interruptions present clear recovery UX.
- Core services can run within documented free-tier constraints.

### Risks and Mitigation
- Risk: iOS background playback behavior differs by version.
- Mitigation: best-effort policy plus explicit UX fallback and test matrix.
- Risk: provider policy/API limitations.
- Mitigation: provider abstraction and secondary source roadmap.
- Risk: free-tier cold starts and quotas.
- Mitigation: lightweight API design, caching, usage monitoring, quota alerts.

### Milestone Roadmap
1. Phase A: feasibility spike for iOS playback behavior and lock-screen transitions.
2. Phase B: MVP build with anonymous playlists and YouTube-first playback.
3. Phase C: optional account sync and cloud persistence migration.
4. Phase D: optimization and source expansion.

### Scope Boundaries
Included:
- iOS mobile browser focus.
- Playlist-centric playback experience.
- Free-tier-first infrastructure.
- Low-bandwidth operation.

Excluded initially:
- Native app distribution.
- Guaranteed uninterrupted lock-screen playback.
- Advanced social/community features.
