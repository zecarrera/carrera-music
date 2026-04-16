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

  // Provide mount point (normally in App.jsx outside AppShell)
  const el = document.createElement('div')
  el.id = 'yt-player-mount'
  document.body.appendChild(el)

  installYTMock()
})

afterEach(() => {
  document.getElementById('yt-player-mount')?.remove()
  vi.useRealTimers()
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

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('recovers and plays when iOS lands the video on PAUSED after loadVideoById', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
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
    act(() => { mockPlayer._fire(1) }) // PLAYING — track A playing

    mockPlayer.loadVideoById.mockClear()
    act(() => { screen.getByText('next').click() })

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })

  it('does not retry playVideo after explicit pause()', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    act(() => { mockPlayer._fire(3) }) // BUFFERING
    act(() => { mockPlayer._fire(1) }) // PLAYING

    mockPlayer.playVideo.mockClear()

    // User pauses
    act(() => { screen.getByText('pause').click() })
    act(() => { mockPlayer._fire(2) }) // PAUSED

    expect(mockPlayer.playVideo).not.toHaveBeenCalled()
  })
})

describe('PlayerContext — synchronous loadTrack in gesture handlers', () => {
  /**
   * On iOS Safari, loadVideoById() only autoplay-starts if called synchronously
   * within a user gesture handler. React's useEffect runs asynchronously (after
   * paint), breaking the gesture chain. These tests verify that each user-facing
   * action calls loadVideoById BEFORE any async work (no timer flush needed).
   */

  it('playQueue calls loadVideoById synchronously — no timer flush required', async () => {
    renderWithProvider()
    await initPlayer()

    // Do NOT flush timers after the click — if loadVideoById fires, it was synchronous
    act(() => { screen.getByText('playQueue').click() })

    // Must be called immediately, without needing vi.runAllTimers()
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('next() calls loadVideoById for the next track synchronously', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_A

    mockPlayer.loadVideoById.mockClear()

    act(() => { screen.getByText('next').click() })

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_B.id)
  })

  it('prev() calls loadVideoById for the previous track synchronously', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue').click() })
    act(() => { screen.getByText('next').click() }) // advance to TRACK_B
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_B

    mockPlayer.loadVideoById.mockClear()

    act(() => { screen.getByText('prev').click() })

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_A.id)
  })

  it('jumpTo() calls loadVideoById for the target track synchronously', async () => {
    renderWithProvider()
    await initPlayer()

    act(() => { screen.getByText('playQueue3').click() }) // 3-track queue
    act(() => { mockPlayer._fire(1) }) // PLAYING at TRACK_A

    mockPlayer.loadVideoById.mockClear()

    act(() => { screen.getByText('jumpTo2').click() }) // jump to index 2 (TRACK_C)

    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith(TRACK_C.id)
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
