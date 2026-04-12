import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TrackItem from './TrackItem.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

// ── PlayerContext mock ───────────────────────────────────────────────────────
const mockPlayer = {
  currentTrack: null,
  isPlaying: false,
  playQueue: vi.fn(),
}
vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => mockPlayer,
}))

// ── PlaylistContext mock ─────────────────────────────────────────────────────
vi.mock('../context/PlaylistContext.jsx', () => ({
  usePlaylists: () => ({
    playlists: [],
    isTrackSaved: () => false,
    addTrack: vi.fn(),
    removeTrackFromAll: vi.fn(),
  }),
}))

// ── AuthContext mock ─────────────────────────────────────────────────────────
vi.mock('../context/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, loading: false }),
}))

const track = {
  id: 'yt_1',
  title: 'Everlong',
  artist: 'Foo Fighters',
  thumbnail: null,
  duration: 253,
}
const queue = [track, { id: 'yt_2', title: 'Best of You', artist: 'Foo Fighters' }]

describe('TrackItem', () => {
  beforeEach(() => {
    mockPlayer.currentTrack = null
    mockPlayer.isPlaying = false
    mockPlayer.playQueue.mockClear()
  })

  it('renders track title and artist', () => {
    render(<TrackItem track={track} />)
    expect(screen.getByText('Everlong')).toBeTruthy()
    expect(screen.getByText(/Foo Fighters/)).toBeTruthy()
  })

  it('clicking the main button calls playQueue with track', () => {
    render(<TrackItem track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /Play Everlong/i }))
    expect(mockPlayer.playQueue).toHaveBeenCalledWith([track], 0)
  })

  it('clicking the main button calls playQueue with full queue and index', () => {
    render(<TrackItem track={queue[1]} queue={queue} queueIndex={1} />)
    fireEvent.click(screen.getByRole('button', { name: /Play Best of You/i }))
    expect(mockPlayer.playQueue).toHaveBeenCalledWith(queue, 1)
  })

  it('clicking the add-to-playlist button does NOT trigger playQueue', () => {
    render(<TrackItem track={track} showAdd />)
    // The + button is inside the actions area which stops propagation
    const addBtn = screen.getByRole('button', { name: /add to playlist/i })
    fireEvent.click(addBtn)
    expect(mockPlayer.playQueue).not.toHaveBeenCalled()
  })

  it('shows playing indicator when this track is current and playing', () => {
    mockPlayer.currentTrack = track
    mockPlayer.isPlaying = true
    render(<TrackItem track={track} />)
    expect(screen.getByText('▶')).toBeTruthy()
  })

  it('shows thumbnail placeholder when track has no thumbnail', () => {
    render(<TrackItem track={track} />)
    expect(screen.getByText('♪')).toBeTruthy()
  })

  it('shows thumbnail img when track has a thumbnail', () => {
    const withThumb = { ...track, thumbnail: 'https://img.yt/thumb.jpg' }
    render(<TrackItem track={withThumb} />)
    expect(screen.getByAltText('')).toBeTruthy()
  })

  it('renders remove button when showRemove is true', () => {
    const onRemove = vi.fn()
    render(<TrackItem track={track} showRemove onRemove={onRemove} />)
    const removeBtn = screen.getByRole('button', { name: /Remove/i })
    fireEvent.click(removeBtn)
    expect(onRemove).toHaveBeenCalledOnce()
    expect(mockPlayer.playQueue).not.toHaveBeenCalled()
  })
})
