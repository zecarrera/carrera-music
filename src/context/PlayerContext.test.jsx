/**
 * Integration tests for PlayerContext.
 * Verifies that playQueue / next / prev result in the YouTube player
 * being instructed to load and play — covering the "starts paused" regression.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import { PlayerProvider, usePlayer } from './PlayerContext.jsx'

// ── YT mock helpers ────────────────────────────────────────────────────────────

function makeMockPlayer() {
  return {
    loadVideoById: vi.fn(),
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
    getDuration: vi.fn(() => 0),
    destroy: vi.fn(),
    getIframe: vi.fn(() => ({ setAttribute: vi.fn() })),
  }
}

let mockPlayer

function installYTMock() {
  mockPlayer = makeMockPlayer()
  window.YT = {
    Player: vi.fn((containerId, opts) => {
      // Fire onReady on next tick (mirrors real YT behaviour)
      setTimeout(() => opts?.events?.onReady?.({ target: mockPlayer }), 0)
      mockPlayer._opts = opts
      mockPlayer._fire = (state) => opts?.events?.onStateChange?.({ data: state })
      return mockPlayer
    }),
  }
}

// ── test component that exposes context ───────────────────────────────────────

const TRACK_A = { id: 'aaaa', title: 'Track A', artist: 'Artist', thumbnail: '' }
const TRACK_B = { id: 'bbbb', title: 'Track B', artist: 'Artist', thumbnail: '' }

const TRACK_C = { id: 'cccc', title: 'Track C', artist: 'Artist', thumbnail: '' }

function TestConsumer() {
  const { playQueue, next, prev, pause, jumpTo, repeatMode, toggleRepeat } = usePlayer()
  return (
    <>
      <button onClick={() => playQueue([TRACK_A, TRACK_B, TRACK_C], 0)}>playQueue3</button>
      <button onClick={() => playQueue([TRACK_A, TRACK_B], 0)}>playQueue</button>
      <button onClick={() => playQueue([TRACK_A], 0)}>playSingle</button>
      <button onClick={next}>next</button>
      <button onClick={prev}>prev</button>
      <button onClick={pause}>pause</button>
      <button onClick={() => jumpTo(2)}>jumpTo2</button>
      <button onClick={toggleRepeat}>toggleRepeat</button>
      <span data-testid="repeat-mode">{repeatMode}</span>
    </>
  )
}

function renderWithProvider() {
  return render(
    <PlayerProvider>
      <TestConsumer />
    </PlayerProvider>
  )
}

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  delete window.YT
  delete window.onYouTubeIframeAPIReady
  document.getElementById('yt-api-script')?.remove()

  // Stub Audio so unlockAudio() calls in gesture handlers don't fail in jsdom
  vi.stubGlobal('Audio', vi.fn(() => ({ play: vi.fn().mockResolvedValue(undefined) })))

  // Provide mount point (normally in App.jsx outside AppShell)
  const el = document.createElement('div')
  el.id = 'yt-player-mount'
  document.body.appendChild(el)

  installYTMock()
})

afterEach(() => {
  document.getElementById('yt-player-mount')?.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete window.YT
  delete window.onYouTubeIframeAPIReady
})

async function initPlayer() {
  // YT.Player is already set; useYouTubePlayer calls initPlayer() synchronously
  // since window.YT.Player is available at hook mount time.
  // Fire the async onReady callback.
  await act(async () => { vi.runAllTimers() })
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('PlayerContext — auto-play', () => {
  it('calls loadVideoById when playQueue is dispatched', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('recovers and plays when iOS lands the video on PAUSED after loadVideoById', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)

    mockPlayer.playVideo.mockClear()

    // iOS flow: video buffers then pauses (autoplay blocked)
    act(() => { mockPlayer._fire(3) }) // BUFFERING
    act(() => { mockPlayer._fire(2) }) // PAUSED — hook must retry

    expect(mockPlayer.playVideo).toHaveBeenCalledOnce()
  })

  it('calls loadVideoById for the next track when next() is called', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(1) }) // PLAYING — seekTo trick fires for next()

    mockPlayer.loadVideoById.mockClear()
    act(() => { screen.getByText('next').click() }) // seekTo(9999) trick
    act(() => { mockPlayer._fire(0) })              // ENDED — auto-advance fires

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })

  it('does not retry playVideo after explicit pause()', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(3) }) // BUFFERING
    act(() => { mockPlayer._fire(1) }) // PLAYING

    mockPlayer.playVideo.mockClear()

    // User pauses
    act(() => { screen.getByText('pause').click() })
    act(() => { mockPlayer._fire(2) }) // PAUSED

    expect(mockPlayer.playVideo).not.toHaveBeenCalled()
  })
})

describe('PlayerContext — deferred loadTrack in gesture handlers', () => {
  /**
   * When ytState is not PLAYING/PAUSED/BUFFERING (no track currently loaded),
   * next/prev fall back to the deferred loadTrack path. playQueue and jumpTo
   * always use this path.
   */

  it('playQueue defers loadVideoById — requires timer flush', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })

    // loadVideoById must NOT fire synchronously (deferred to setTimeout)
    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()

    // After flushing timers it fires with the correct video id
    await act(async () => { vi.runAllTimers() })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('next() defers loadVideoById for the next track when no track is loaded (ytState UNSTARTED)', async () => {
    renderWithProvider()
    await initPlayer()

    // playQueue advances index but ytState stays UNSTARTED (no _fire(1))
    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    // ytState = UNSTARTED — next() uses deferred fallback

    mockPlayer.loadVideoById.mockClear()
    act(() => { screen.getByText('next').click() })

    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()

    await act(async () => { vi.runAllTimers() })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })

  it('prev() defers loadVideoById for the previous track when no track is loaded (ytState UNSTARTED)', async () => {
    renderWithProvider()
    await initPlayer()

    // Advance to TRACK_B via fallback (UNSTARTED → deferred), ytState stays UNSTARTED
    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { screen.getByText('next').click() }) // fallback since UNSTARTED
    await act(async () => { vi.runAllTimers() })
    // ytState = UNSTARTED — prev() uses deferred fallback

    mockPlayer.loadVideoById.mockClear()
    act(() => { screen.getByText('prev').click() })

    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()

    await act(async () => { vi.runAllTimers() })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('jumpTo() defers loadVideoById for the target track', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue3').click() }) // 3-track queue
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_A

    mockPlayer.loadVideoById.mockClear()
    act(() => { screen.getByText('jumpTo2').click() }) // jump to index 2 (TRACK_C)

    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()

    await act(async () => { vi.runAllTimers() })
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_C.id)
  })
})

describe('PlayerContext — seekTo trick for next/prev', () => {
  /**
   * When ytState is PLAYING/PAUSED/BUFFERING (a track is loaded), next() and
   * prev() seek the current track to position 9999s instead of calling
   * loadVideoById. This forces a natural ENDED event which triggers auto-advance
   * — the only path that reliably autoplays on iOS. pendingNextRef stores the
   * intended target so auto-advance loads the right track.
   */

  it('next() calls seekTo(9999) and play() instead of loadVideoById when track is loaded', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_A

    mockPlayer.loadVideoById.mockClear()
    mockPlayer.seekTo.mockClear()

    act(() => { screen.getByText('next').click() })

    expect(mockPlayer.seekTo).toHaveBeenCalledWith(9999, true)
    expect(mockPlayer.playVideo).toHaveBeenCalled()
    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()
  })

  it('next() loads correct track via auto-advance when ENDED fires after seekTo', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_A

    mockPlayer.loadVideoById.mockClear()

    act(() => { screen.getByText('next').click() }) // seekTo(9999) trick
    act(() => { mockPlayer._fire(0) })              // ENDED fires naturally

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })

  it('prev() uses seekTo trick and loads previous track on ENDED', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    // Use fallback (UNSTARTED → deferred) to advance to TRACK_B
    act(() => { screen.getByText('next').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_B

    mockPlayer.loadVideoById.mockClear()

    act(() => { screen.getByText('prev').click() }) // seekTo(9999) trick
    act(() => { mockPlayer._fire(0) })              // ENDED fires naturally

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('natural ENDED (no seekTo trick) still advances to next track normally', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    await act(async () => { vi.runAllTimers() })
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_A

    mockPlayer.loadVideoById.mockClear()
    act(() => { mockPlayer._fire(0) }) // ENDED naturally (no next/prev pressed)

    // pendingNextRef is null — normal auto-advance fires
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })
})

describe('PlayerContext — repeat mode', () => {
  it('defaults to none', async () => {
    renderWithProvider()
    await initPlayer()
    expect(screen.getByTestId('repeat-mode').textContent).toBe('none')
  })

  it('toggleRepeat cycles none → all → one → none', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('toggleRepeat').click() })
    expect(screen.getByTestId('repeat-mode').textContent).toBe('all')

    act(() => { screen.getByText('toggleRepeat').click() })
    expect(screen.getByTestId('repeat-mode').textContent).toBe('one')

    act(() => { screen.getByText('toggleRepeat').click() })
    expect(screen.getByTestId('repeat-mode').textContent).toBe('none')
  })

  it('repeat=none: does NOT advance or replay when last track ends', async () => {
    renderWithProvider()
    await initPlayer()

    // queue with 2 tracks, start at track B (last)
    act(() => { screen.getByText('playQueue').click() })
    act(() => { screen.getByText('next').click() }) // now at TRACK_B (index 1)
    act(() => { mockPlayer._fire(1) }) // PLAYING

    mockPlayer.loadVideoById.mockClear()
    act(() => { mockPlayer._fire(0) }) // ENDED

    expect(mockPlayer.loadVideoById).not.toHaveBeenCalled()
  })

  it('repeat=all: wraps back to first track when last track ends', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    act(() => { screen.getByText('toggleRepeat').click() }) // → all

    act(() => { screen.getByText('next').click() }) // now at TRACK_B (last)
    act(() => { mockPlayer._fire(1) }) // PLAYING

    mockPlayer.loadVideoById.mockClear()
    act(() => { mockPlayer._fire(0) }) // ENDED — should wrap to TRACK_A

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('repeat=all: advances normally when not at last track', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() }) // at TRACK_A (index 0)
    act(() => { screen.getByText('toggleRepeat').click() }) // → all
    act(() => { mockPlayer._fire(1) }) // PLAYING

    mockPlayer.loadVideoById.mockClear()
    act(() => { mockPlayer._fire(0) }) // ENDED — should advance to TRACK_B

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })

  it('repeat=one: restarts the same track when it ends', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playSingle').click() }) // only TRACK_A in queue
    act(() => { screen.getByText('toggleRepeat').click() }) // none → all
    act(() => { screen.getByText('toggleRepeat').click() }) // all → one
    act(() => { mockPlayer._fire(1) }) // PLAYING

    mockPlayer.seekTo.mockClear()
    mockPlayer.playVideo.mockClear()
    act(() => { mockPlayer._fire(0) }) // ENDED — should restart

    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0, true)
    // playVideo is called by wantToPlay recovery or direct call
    expect(mockPlayer.playVideo).toHaveBeenCalled()
  })
})
