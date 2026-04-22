/**
 * Tests that the YouTube player mount point is always present in the DOM,
 * even while Supabase auth is loading (showing the splash screen).
 *
 * Bug: `iframe#yt-player-mount` was inside AppShell behind `if (loading) return <SplashScreen />`.
 * The YouTube IFrame API can fire `onYouTubeIframeAPIReady` before auth completes.
 * When it does, `initPlayer()` fails silently (element doesn't exist), `readyRef`
 * stays false, and the player is never created. All subsequent play() calls are no-ops.
 *
 * Fix: render `iframe#yt-player-mount` outside AppShell directly inside App(), so
 * it is in the DOM from the very first render. The iframe carries allow="autoplay;
 * encrypted-media" set by React at mount time — before the YouTube IFrame API sets
 * the src — so iOS Safari grants the iframe autoplay permission at navigation time.
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
   * REGRESSION [iOS autoplay]: iOS Safari evaluates allow="autoplay" on an
   * iframe at navigation time (when its src is set). The YouTube IFrame API
   * creates the player iframe asynchronously — after the YT.Player() constructor
   * returns — so intercepting document.createElement is unreliable (the intercept
   * is restored before the real API creates its iframe).
   *
   * Fix: pre-render the <iframe> in JSX with allow="autoplay; encrypted-media"
   * already set. React guarantees the attribute is present at mount time, before
   * any JS runs, so when the YouTube IFrame API sets the iframe src the attribute
   * is already there and iOS evaluates it correctly.
   */
  it('renders yt-player-mount as an <iframe> with allow="autoplay" (pre-rendered for iOS autoplay)', () => {
    render(<App />)
    const el = document.getElementById('yt-player-mount')
    expect(el?.tagName.toLowerCase()).toBe('iframe')
    expect(el?.getAttribute('allow')).toMatch(/autoplay/)
  })
})
