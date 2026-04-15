import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useYouTubePlayer } from './useYouTubePlayer.js'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeMockPlayer() {
  return {
    loadVideoById: vi.fn(),
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
    getDuration: vi.fn(() => 0),
    destroy: vi.fn(),
    getIframe: vi.fn(() => document.createElement('iframe')),
  }
}

/**
 * Installs a window.YT.Player mock.
 * When `requireElement` is true the onReady callback only fires if the
 * container element actually exists in the DOM — mirroring real YT behaviour.
 */
function installYTMock(requireElement = false) {
  const mockPlayer = makeMockPlayer()

  window.YT = {
    Player: vi.fn((containerId, opts) => {
      const el = document.getElementById(containerId)
      if (!requireElement || el) {
        setTimeout(() => opts?.events?.onReady?.({ target: mockPlayer }), 0)
      }
      mockPlayer._fireStateChange = (state) => opts?.events?.onStateChange?.({ data: state })
      return mockPlayer
    }),
  }

  return mockPlayer
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useYouTubePlayer', () => {
  let mountPoint

  beforeEach(() => {
    vi.useFakeTimers()
    delete window.YT
    delete window.onYouTubeIframeAPIReady
    document.getElementById('yt-api-script')?.remove()
  })

  afterEach(() => {
    mountPoint?.remove()
    mountPoint = null
    vi.useRealTimers()
    delete window.YT
    delete window.onYouTubeIframeAPIReady
  })

  function addMountPoint() {
    mountPoint = document.createElement('div')
    mountPoint.id = 'yt-player-mount'
    document.body.appendChild(mountPoint)
    return mountPoint
  }

  // ── REGRESSION: the actual bug ─────────────────────────────────────────────
  /**
   * Reproduces the production bug:
   *   `yt-player-mount` is absent when `onYouTubeIframeAPIReady` fires
   *   (because AppShell renders <SplashScreen /> during Supabase auth).
   *   The YT IFrame API only fires its callback ONCE, so even after the
   *   element appears, `onReady` never fires, `readyRef` stays false, and
   *   `loadVideoById` is never called — the video never loads, nothing plays.
   */
  it('REGRESSION: loadVideoById never called when mount point absent at API init time', async () => {
    // yt-player-mount is NOT in the DOM (auth splash is showing)
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    // YT API fires its one-time callback — element not present, onReady skipped
    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    // Auth completes — element is now added to the DOM (too late)
    addMountPoint()

    // User taps a track
    act(() => { result.current.loadTrack('dQw4w9WgXcQ') })
    await act(async () => { vi.runAllTimers() })

    // loadVideoById is NEVER called because readyRef.current is still false
    // (onReady never fired), so the video is never loaded into the player.
    // play() / playVideo() would be calling into an uninitialized player.
    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()
  })

  // ── CORRECT BEHAVIOUR (what should happen after the fix) ──────────────────
  it('initializes player and loads track when mount point exists before API fires', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() }) // fires onReady

    expect(window.YT.Player).toHaveBeenCalledOnce()

    act(() => { result.current.loadTrack('dQw4w9WgXcQ') })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith('dQw4w9WgXcQ')

    act(() => { result.current.play() })
    expect(mockPlayer.playVideo).toHaveBeenCalledOnce()
  })

  it('queues a pending track and loads it when player becomes ready', async () => {
    const mockPlayer = installYTMock(/* requireElement */ false)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    // loadTrack called BEFORE onReady fires
    act(() => { result.current.loadTrack('pendingVideoId') })

    // API fires and onReady is triggered
    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith('pendingVideoId')
  })

  it('play() and pause() delegate to the YT player methods', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    act(() => { result.current.play() })
    expect(mockPlayer.playVideo).toHaveBeenCalledOnce()

    act(() => { result.current.pause() })
    expect(mockPlayer.pauseVideo).toHaveBeenCalledOnce()
  })

  // ── AUTO-PLAY RECOVERY (the new behaviour) ────────────────────────────────
  /**
   * On iOS Safari, loadVideoById() in a cross-origin iframe that hasn't received
   * a direct user tap will load the video (BUFFERING) but then land on PAUSED
   * instead of PLAYING because the browser blocks unmuted autoplay.
   * The fix: when the player transitions to PAUSED right after loadTrack() was
   * called (wantToPlayRef is true), immediately retry playVideo().
   */
  it('calls playVideo when video enters PAUSED after loadTrack (iOS autoplay recovery)', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    mockPlayer.playVideo.mockClear()

    // Simulate user selecting a track
    act(() => { result.current.loadTrack('dQw4w9WgXcQ') })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith('dQw4w9WgXcQ')

    // iOS flow: video loads but autoplay is blocked
    act(() => { mockPlayer._fireStateChange(3) }) // BUFFERING
    act(() => { mockPlayer._fireStateChange(2) }) // PAUSED (iOS blocked autoplay)

    // Hook should have retried playVideo() automatically
    expect(mockPlayer.playVideo).toHaveBeenCalledOnce()
  })

  it('does NOT retry playVideo when user explicitly pauses', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    // Track loads and plays
    act(() => { result.current.loadTrack('dQw4w9WgXcQ') })
    act(() => { mockPlayer._fireStateChange(3) }) // BUFFERING
    act(() => { mockPlayer._fireStateChange(1) }) // PLAYING — clears wantToPlay

    mockPlayer.playVideo.mockClear()

    // User explicitly pauses
    act(() => { result.current.pause() })
    act(() => { mockPlayer._fireStateChange(2) }) // PAUSED (user action)

    // Should NOT retry — user wants it paused
    expect(mockPlayer.playVideo).not.toHaveBeenCalled()
  })

  it('destroys the player on unmount', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { unmount } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    unmount()
    expect(mockPlayer.destroy).toHaveBeenCalledOnce()
  })
})
