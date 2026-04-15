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

function TestConsumer() {
  const { playQueue, next, prev, pause } = usePlayer()
  return (
    <>
      <button onClick={() => playQueue([TRACK_A, TRACK_B], 0)}>playQueue</button>
      <button onClick={() => playQueue([TRACK_A], 0)}>playSingle</button>
      <button onClick={next}>next</button>
      <button onClick={prev}>prev</button>
      <button onClick={pause}>pause</button>
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
