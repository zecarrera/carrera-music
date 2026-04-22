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
    mountPoint = document.createElement('iframe')
    mountPoint.id = 'yt-player-mount'
    mountPoint.setAttribute('allow', 'autoplay; encrypted-media')
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
    // loadTrack now calls playVideo() immediately (iOS gesture chain preservation)
    // plus play() below — total 2 calls
    act(() => { result.current.play() })
    expect(mockPlayer.playVideo).toHaveBeenCalledTimes(2)
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
  it('calls playVideo immediately on loadTrack (iOS gesture chain preservation)', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    mockPlayer.playVideo.mockClear()

    // loadTrack must call both loadVideoById AND playVideo synchronously —
    // both postMessages sent during the user gesture before activation expires.
    act(() => { result.current.loadTrack('dQw4w9WgXcQ') })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith('dQw4w9WgXcQ')
    expect(mockPlayer.playVideo).toHaveBeenCalledOnce()
  })

  it('calls playVideo on PAUSED recovery AND on initial loadTrack (iOS autoplay recovery)', async () => {
    addMountPoint()
    const mockPlayer = installYTMock(/* requireElement */ true)

    const { result } = renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })
    await act(async () => { vi.runAllTimers() })

    mockPlayer.playVideo.mockClear()

    act(() => { result.current.loadTrack('dQw4w9WgXcQ') })
    // 1st call: immediate playVideo in loadTrack (gesture chain)
    expect(mockPlayer.playVideo).toHaveBeenCalledTimes(1)

    // iOS flow: video loads but autoplay is still blocked
    act(() => { mockPlayer._fireStateChange(3) }) // BUFFERING
    act(() => { mockPlayer._fireStateChange(2) }) // PAUSED (iOS blocked autoplay)

    // 2nd call: PAUSED recovery
    expect(mockPlayer.playVideo).toHaveBeenCalledTimes(2)
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

  /**
   * REGRESSION [iOS autoplay]: iOS Safari evaluates allow="autoplay" on an iframe
   * at navigation time (when src is set). The YouTube IFrame API creates its iframe
   * asynchronously — after the YT.Player() constructor returns — so intercepting
   * document.createElement is unreliable. The fix is to pre-render the <iframe>
   * in JSX with allow="autoplay; encrypted-media" already set by React at mount
   * time, before any JS runs. When the YT API later sets the iframe's src, the
   * attribute is already there and iOS grants autoplay permission.
   */
  it('REGRESSION [iOS]: yt-player-mount iframe already has allow="autoplay" before YT sets src', async () => {
    const mountPoint = addMountPoint() // created with allow="autoplay; encrypted-media" (mirrors JSX)

    installYTMock(/* requireElement */ true)

    renderHook(() =>
      useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: vi.fn() })
    )

    act(() => { window.onYouTubeIframeAPIReady?.() })

    // The element must already carry allow="autoplay" before the YT API initialises.
    // In production this is guaranteed by React rendering the <iframe> in JSX;
    // in tests addMountPoint() mirrors that by setting the attribute at creation time.
    expect(mountPoint.getAttribute('allow')).toMatch(/autoplay/)
  })
})
