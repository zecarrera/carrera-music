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
        setTimeout(() => opts?.events?.onReady?.(), 0)
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
