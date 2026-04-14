import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SearchView from './SearchView.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

const playQueue = vi.fn()
vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => ({ playQueue, queue: [], queueIndex: 0, currentTrack: null, isPlaying: false }),
}))

vi.mock('../context/PlaylistContext.jsx', () => ({
  usePlaylists: () => ({ playlists: [], isTrackSaved: () => false, addTrack: vi.fn(), removeTrack: vi.fn() }),
}))

const mockSearch = vi.fn()
const mockSearchPlaylists = vi.fn()
const mockFetchPlaylistTracks = vi.fn()
vi.mock('../providers/youtubeProvider.js', () => ({
  youtubeProvider: {
    search: (...args) => mockSearch(...args),
    searchPlaylists: (...args) => mockSearchPlaylists(...args),
    fetchPlaylistTracks: (...args) => mockFetchPlaylistTracks(...args),
  },
}))

const PAGE1 = {
  tracks: [
    { id: 'v1', title: 'Song 1', artist: 'Artist A', thumbnail: null, duration: 200 },
    { id: 'v2', title: 'Song 2', artist: 'Artist B', thumbnail: null, duration: 180 },
  ],
  nextPageToken: 'TOKEN_2',
}

const PAGE2 = {
  tracks: [
    { id: 'v3', title: 'Song 3', artist: 'Artist C', thumbnail: null, duration: 220 },
  ],
  nextPageToken: null,
}

const PLAYLISTS_PAGE1 = {
  playlists: [
    { id: 'pl1', title: 'Top Hits', channelTitle: 'Music Ch', thumbnail: null, itemCount: 20 },
    { id: 'pl2', title: 'Chill Mix', channelTitle: 'Relax Ch', thumbnail: null, itemCount: 10 },
  ],
  nextPageToken: null,
}

const SAMPLE_TRACKS = [
  { id: 'vid1', title: 'Track A', artist: 'X', thumbnail: null, thumbnailMedium: null, duration: 180, providerId: 'youtube' },
]

// Minimal IntersectionObserver mock
let observerCallback = null
const observeSpy = vi.fn()
const disconnectSpy = vi.fn()

beforeEach(() => {
  observerCallback = null
  observeSpy.mockClear()
  disconnectSpy.mockClear()
  mockSearch.mockClear()
  mockSearchPlaylists.mockClear()
  mockFetchPlaylistTracks.mockClear()
  playQueue.mockClear()
  localStorage.clear()

  globalThis.IntersectionObserver = vi.fn((cb) => {
    observerCallback = cb
    return { observe: observeSpy, disconnect: disconnectSpy }
  })
})

afterEach(() => {
  delete globalThis.IntersectionObserver
})

function triggerIntersection() {
  observerCallback?.([{ isIntersecting: true }])
}

describe('SearchView', () => {
  it('renders empty state with no recent searches', () => {
    render(<SearchView />)
    expect(screen.getByText(/search for any song or artist/i)).toBeInTheDocument()
  })

  it('shows Songs and Playlists mode tabs', () => {
    render(<SearchView />)
    expect(screen.getByRole('tab', { name: /songs/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /playlists/i })).toBeInTheDocument()
  })

  it('Songs tab is active by default', () => {
    render(<SearchView />)
    expect(screen.getByRole('tab', { name: /songs/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /playlists/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows results after a successful search', async () => {
    mockSearch.mockResolvedValueOnce(PAGE1)
    render(<SearchView />)
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'rock' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('Song 1')).toBeInTheDocument())
    expect(screen.getByText('Song 2')).toBeInTheDocument()
    expect(mockSearch).toHaveBeenCalledWith('rock')
  })

  it('appends results when IntersectionObserver fires', async () => {
    mockSearch.mockResolvedValueOnce(PAGE1).mockResolvedValueOnce(PAGE2)
    render(<SearchView />)
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'rock' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('Song 1')).toBeInTheDocument())

    await act(async () => { triggerIntersection() })
    await waitFor(() => expect(screen.getByText('Song 3')).toBeInTheDocument())

    expect(mockSearch).toHaveBeenCalledTimes(2)
    expect(mockSearch).toHaveBeenNthCalledWith(2, 'rock', 'TOKEN_2')
    expect(screen.getByText('Song 1')).toBeInTheDocument()
    expect(screen.getByText('Song 2')).toBeInTheDocument()
  })

  it('does not load more when there is no nextPageToken', async () => {
    mockSearch.mockResolvedValueOnce({ tracks: PAGE1.tracks, nextPageToken: null })
    render(<SearchView />)
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'jazz' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('Song 1')).toBeInTheDocument())

    expect(document.querySelector('.load-more-sentinel')).not.toBeInTheDocument()
    await act(async () => { triggerIntersection() })
    expect(mockSearch).toHaveBeenCalledTimes(1)
  })

  it('shows error state when search fails', async () => {
    mockSearch.mockRejectedValueOnce(new Error('API quota exceeded'))
    render(<SearchView />)
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'rock' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText(/API quota exceeded/i)).toBeInTheDocument())
  })

  it('clears results and resets pagination on clear', async () => {
    mockSearch.mockResolvedValueOnce(PAGE1)
    render(<SearchView />)
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'rock' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('Song 1')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.queryByText('Song 1')).not.toBeInTheDocument()
    expect(document.querySelector('.load-more-sentinel')).not.toBeInTheDocument()
  })

  it('resets results when a new search is run', async () => {
    mockSearch.mockResolvedValueOnce(PAGE1).mockResolvedValueOnce({ tracks: [{ id: 'v9', title: 'New Song', artist: 'X', thumbnail: null, duration: 100 }], nextPageToken: null })
    render(<SearchView />)

    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'rock' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('Song 1')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'jazz' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('New Song')).toBeInTheDocument())
    expect(screen.queryByText('Song 1')).not.toBeInTheDocument()
  })

  // ── Playlist mode ────────────────────────────────────────────────────────────

  it('switching to Playlists tab clears query and results', async () => {
    mockSearch.mockResolvedValueOnce(PAGE1)
    render(<SearchView />)
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), { target: { value: 'rock' } })
    fireEvent.submit(screen.getByRole('button', { name: /🔍/ }).closest('form'))
    await waitFor(() => expect(screen.getByText('Song 1')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: /playlists/i }))
    expect(screen.queryByText('Song 1')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search playlists/i)).toHaveValue('')
  })

  it('shows playlist empty hint when in Playlists mode with no recent', () => {
    render(<SearchView />)
    fireEvent.click(screen.getByRole('tab', { name: /playlists/i }))
    expect(screen.getByText(/search for any youtube playlist/i)).toBeInTheDocument()
  })

  it('searches playlists and renders playlist cards', async () => {
    mockSearchPlaylists.mockResolvedValueOnce(PLAYLISTS_PAGE1)
    render(<SearchView />)
    fireEvent.click(screen.getByRole('tab', { name: /playlists/i }))
    fireEvent.change(screen.getByPlaceholderText(/search playlists/i), { target: { value: 'chill' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/search playlists/i).closest('form')) })
    await waitFor(() => expect(screen.getByText('Top Hits')).toBeInTheDocument())
    expect(screen.getByText('Chill Mix')).toBeInTheDocument()
    expect(mockSearchPlaylists).toHaveBeenCalledWith('chill')
  })

  it('tapping a playlist card fetches tracks and calls playQueue', async () => {
    mockSearchPlaylists.mockResolvedValueOnce(PLAYLISTS_PAGE1)
    mockFetchPlaylistTracks.mockResolvedValueOnce(SAMPLE_TRACKS)
    render(<SearchView />)
    fireEvent.click(screen.getByRole('tab', { name: /playlists/i }))
    fireEvent.change(screen.getByPlaceholderText(/search playlists/i), { target: { value: 'hits' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/search playlists/i).closest('form')) })
    await waitFor(() => screen.getByText('Top Hits'))

    await act(async () => { fireEvent.click(screen.getByText('Top Hits').closest('button')) })
    await waitFor(() => {
      expect(mockFetchPlaylistTracks).toHaveBeenCalledWith('pl1')
      expect(playQueue).toHaveBeenCalledWith(SAMPLE_TRACKS, 0)
    })
  })

  it('shows error when playlist is empty or private', async () => {
    mockSearchPlaylists.mockResolvedValueOnce(PLAYLISTS_PAGE1)
    mockFetchPlaylistTracks.mockResolvedValueOnce([])
    render(<SearchView />)
    fireEvent.click(screen.getByRole('tab', { name: /playlists/i }))
    fireEvent.change(screen.getByPlaceholderText(/search playlists/i), { target: { value: 'hits' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/search playlists/i).closest('form')) })
    await waitFor(() => screen.getByText('Top Hits'))

    await act(async () => { fireEvent.click(screen.getByText('Top Hits').closest('button')) })
    await waitFor(() => expect(screen.getByText(/empty or private/i)).toBeInTheDocument())
    expect(playQueue).not.toHaveBeenCalled()
  })

  it('shows no playlists found message for empty playlist search', async () => {
    mockSearchPlaylists.mockResolvedValueOnce({ playlists: [], nextPageToken: null })
    render(<SearchView />)
    fireEvent.click(screen.getByRole('tab', { name: /playlists/i }))
    fireEvent.change(screen.getByPlaceholderText(/search playlists/i), { target: { value: 'xyznotfound' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/search playlists/i).closest('form')) })
    await waitFor(() => expect(screen.getByText(/no playlists found/i)).toBeInTheDocument())
  })
})
