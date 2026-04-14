import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LibraryView from './LibraryView.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

const playQueue = vi.fn()
vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => ({ playQueue }),
}))

const playlistsState = { playlists: [], createPlaylist: vi.fn() }
vi.mock('../context/PlaylistContext.jsx', () => ({
  usePlaylists: () => playlistsState,
}))

const TRACKS = [
  { id: 'v1', title: 'Track 1', thumbnail: null },
  { id: 'v2', title: 'Track 2', thumbnail: null },
  { id: 'v3', title: 'Track 3', thumbnail: null },
]

beforeEach(() => {
  playQueue.mockClear()
  playlistsState.createPlaylist.mockClear()
  playlistsState.playlists = []
})

describe('LibraryView', () => {
  it('renders empty state when no playlists', () => {
    render(<LibraryView onOpenPlaylist={vi.fn()} />)
    expect(screen.getByText(/your library is empty/i)).toBeInTheDocument()
  })

  it('renders playlist cards with name and track count', () => {
    playlistsState.playlists = [{ id: 'p1', name: 'Chill', tracks: TRACKS }]
    render(<LibraryView onOpenPlaylist={vi.fn()} />)
    expect(screen.getByText('Chill')).toBeInTheDocument()
    expect(screen.getByText('3 tracks')).toBeInTheDocument()
  })

  it('navigates to playlist when card body is clicked', () => {
    playlistsState.playlists = [{ id: 'p1', name: 'Chill', tracks: TRACKS }]
    const onOpenPlaylist = vi.fn()
    render(<LibraryView onOpenPlaylist={onOpenPlaylist} />)
    fireEvent.click(screen.getByText('Chill'))
    expect(onOpenPlaylist).toHaveBeenCalledWith('p1')
  })

  it('calls playQueue with tracks from index 0 when ▶ is clicked', () => {
    playlistsState.playlists = [{ id: 'p1', name: 'Chill', tracks: TRACKS }]
    const onOpenPlaylist = vi.fn()
    render(<LibraryView onOpenPlaylist={onOpenPlaylist} />)
    fireEvent.click(screen.getByRole('button', { name: /play all/i }))
    expect(playQueue).toHaveBeenCalledWith(TRACKS, 0)
    expect(onOpenPlaylist).not.toHaveBeenCalled()
  })

  it('calls playQueue with shuffled tracks when 🔀 is clicked', () => {
    playlistsState.playlists = [{ id: 'p1', name: 'Chill', tracks: TRACKS }]
    const onOpenPlaylist = vi.fn()
    render(<LibraryView onOpenPlaylist={onOpenPlaylist} />)
    fireEvent.click(screen.getByRole('button', { name: /shuffle play/i }))
    expect(playQueue).toHaveBeenCalledTimes(1)
    const [calledTracks, calledIndex] = playQueue.mock.calls[0]
    expect(calledIndex).toBe(0)
    expect(calledTracks).toHaveLength(TRACKS.length)
    expect(calledTracks).toEqual(expect.arrayContaining(TRACKS))
    expect(onOpenPlaylist).not.toHaveBeenCalled()
  })

  it('does not show play buttons for empty playlists', () => {
    playlistsState.playlists = [{ id: 'p1', name: 'Empty', tracks: [] }]
    render(<LibraryView onOpenPlaylist={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /play all/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /shuffle play/i })).not.toBeInTheDocument()
  })

  it('shows singular "track" for a single-track playlist', () => {
    playlistsState.playlists = [{ id: 'p1', name: 'Solo', tracks: [TRACKS[0]] }]
    render(<LibraryView onOpenPlaylist={vi.fn()} />)
    expect(screen.getByText('1 track')).toBeInTheDocument()
  })
})
