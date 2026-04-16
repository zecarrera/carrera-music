/**
 * Tests that the YouTube player mount point is always present in the DOM,
 * even while Supabase auth is loading (showing the splash screen).
 *
 * Bug: `div#yt-player-mount` was inside AppShell behind `if (loading) return <SplashScreen />`.
 * The YouTube IFrame API can fire `onYouTubeIframeAPIReady` before auth completes.
 * When it does, `initPlayer()` fails silently (element doesn't exist), `readyRef`
 * stays false, and the player is never created. All subsequent play() calls are no-ops.
 *
 * Fix: move `div#yt-player-mount` outside AppShell into App(), directly inside
 * PlayerProvider, so it is in the DOM from the very first render.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import App from './App.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

// Simulate auth being in a loading state (Supabase round-trip in progress)
vi.mock('../context/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ loading: true, user: null, isAnonymous: true }),
}))

vi.mock('../context/PlayerContext.jsx', () => ({
  PlayerProvider: ({ children }) => children,
  usePlayer: () => ({
    currentTrack: null, isPlaying: false, ytState: -1,
    play: vi.fn(), pause: vi.fn(), next: vi.fn(), prev: vi.fn(),
    seekTo: vi.fn(), getCurrentTime: () => 0, getDuration: () => 0,
    queue: [], queueIndex: 0, jumpTo: vi.fn(), playQueue: vi.fn(),
  }),
}))

vi.mock('../context/PlaylistContext.jsx', () => ({
  PlaylistProvider: ({ children }) => children,
  usePlaylists: () => ({
    playlists: [], createPlaylist: vi.fn(), renamePlaylist: vi.fn(),
    deletePlaylist: vi.fn(), addTrack: vi.fn(), removeTrack: vi.fn(),
    removeTrackFromAll: vi.fn(), isTrackSaved: () => false, reorderTrack: vi.fn(),
  }),
}))

describe('App — player mount point', () => {
  it('renders yt-player-mount in the DOM even while auth is loading', () => {
    render(<App />)
    // This FAILS before the fix:
    // yt-player-mount is inside AppShell behind `if (loading) return <SplashScreen />`
    // so it doesn't exist during auth. The YT IFrame API fires once — if the element
    // is missing, the player is never initialized and nothing plays.
    expect(document.getElementById('yt-player-mount')).not.toBeNull()
  })

  /**
   * REGRESSION [iOS autoplay]: iOS Safari evaluates the `allow` attribute on an
   * iframe at navigation time (when the iframe src is loaded). Setting it
   * programmatically after the fact (e.g. via setAttribute in onReady) has no
   * effect. Without `allow="autoplay"` pre-set on the element, iOS Safari blocks
   * programmatic playback regardless of whether it is called from a user-gesture
   * handler — the video buffers then lands on PAUSED, requiring a second tap.
   *
   * Fix: use <iframe> instead of <div> so the YT IFrame API navigates an existing
   * iframe element in-place, preserving the pre-set allow attribute.
   */
  it('REGRESSION [iOS]: yt-player-mount is an <iframe> with allow="autoplay" pre-set at element creation', () => {
    render(<App />)
    const el = document.getElementById('yt-player-mount')
    expect(el?.tagName.toLowerCase()).toBe('iframe')
    expect(el?.getAttribute('allow')).toMatch(/autoplay/)
  })
})
