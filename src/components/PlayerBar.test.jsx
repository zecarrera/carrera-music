import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlayerBar from './PlayerBar.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

const mockPlayer = {
  currentTrack: null,
  isPlaying: false,
  ytState: 1,
  play: vi.fn(),
  pause: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  seekTo: vi.fn(),
  getCurrentTime: () => 30,
  getDuration: () => 180,
  queueIndex: 0,
  queue: [],
}

vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => mockPlayer,
}))

const track = { id: 'yt1', title: 'Test Song', artist: 'Test Artist', thumbnail: null, thumbnailMedium: null }

describe('PlayerBar', () => {
  beforeEach(() => {
    mockPlayer.currentTrack = null
    mockPlayer.isPlaying = false
    mockPlayer.queueIndex = 0
    mockPlayer.queue = []
    vi.clearAllMocks()
  })

  it('renders nothing when no track is playing', () => {
    const { container } = render(<PlayerBar onOpenPlayer={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders track title and artist when a track is set', () => {
    mockPlayer.currentTrack = track
    mockPlayer.queue = [track]
    render(<PlayerBar onOpenPlayer={vi.fn()} />)
    expect(screen.getByText('Test Song')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
  })

  it('calls onOpenPlayer when track info area is tapped', () => {
    mockPlayer.currentTrack = track
    mockPlayer.queue = [track]
    const onOpenPlayer = vi.fn()
    render(<PlayerBar onOpenPlayer={onOpenPlayer} />)
    fireEvent.click(screen.getByLabelText('Open player'))
    expect(onOpenPlayer).toHaveBeenCalledOnce()
  })

  it('disables prev button at start of queue', () => {
    mockPlayer.currentTrack = track
    mockPlayer.queue = [track]
    mockPlayer.queueIndex = 0
    render(<PlayerBar onOpenPlayer={vi.fn()} />)
    expect(screen.getByLabelText('Previous')).toBeDisabled()
  })

  it('disables next button at end of queue', () => {
    mockPlayer.currentTrack = track
    mockPlayer.queue = [track]
    mockPlayer.queueIndex = 0
    render(<PlayerBar onOpenPlayer={vi.fn()} />)
    expect(screen.getByLabelText('Next')).toBeDisabled()
  })

  it('calls play when play button clicked while paused', () => {
    mockPlayer.currentTrack = track
    mockPlayer.queue = [track]
    mockPlayer.isPlaying = false
    render(<PlayerBar onOpenPlayer={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Play'))
    expect(mockPlayer.play).toHaveBeenCalledOnce()
  })

  it('calls pause when pause button clicked while playing', () => {
    mockPlayer.currentTrack = track
    mockPlayer.queue = [track]
    mockPlayer.isPlaying = true
    render(<PlayerBar onOpenPlayer={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Pause'))
    expect(mockPlayer.pause).toHaveBeenCalledOnce()
  })
})
