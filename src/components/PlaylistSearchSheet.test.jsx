import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PlaylistSearchSheet from './PlaylistSearchSheet.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

// ── youtubeProvider mock ─────────────────────────────────────────────────────
const mockSearchPlaylists = vi.fn()
const mockFetchPlaylistTracks = vi.fn()

vi.mock('../providers/youtubeProvider.js', () => ({
  youtubeProvider: {
    searchPlaylists: (...args) => mockSearchPlaylists(...args),
    fetchPlaylistTracks: (...args) => mockFetchPlaylistTracks(...args),
  },
}))

// ── PlayerContext mock ───────────────────────────────────────────────────────
const mockPlayQueue = vi.fn()

vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => ({
    currentTrack: null,
    isPlaying: false,
    playQueue: mockPlayQueue,
  }),
}))

const samplePlaylists = [
  { id: 'pl1', title: 'Top Hits 2024', channelTitle: 'Music Channel', thumbnail: null, itemCount: 30 },
  { id: 'pl2', title: 'Chill Vibes', channelTitle: 'Relaxing Music', thumbnail: null, itemCount: 15 },
]

const sampleTracks = [
  { id: 'vid1', title: 'Song One', artist: 'Artist A', thumbnail: null, thumbnailMedium: null, duration: 180, providerId: 'youtube' },
  { id: 'vid2', title: 'Song Two', artist: 'Artist B', thumbnail: null, thumbnailMedium: null, duration: 220, providerId: 'youtube' },
]

describe('PlaylistSearchSheet', () => {
  beforeEach(() => {
    mockSearchPlaylists.mockReset()
    mockFetchPlaylistTracks.mockReset()
    mockPlayQueue.mockReset()
    localStorage.clear()
  })

  it('renders the sheet with search input and close button', () => {
    const onClose = vi.fn()
    render(<PlaylistSearchSheet onClose={onClose} />)
    expect(screen.getByPlaceholderText(/Search YouTube playlists/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Close/i })).toBeTruthy()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<PlaylistSearchSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows empty hint text when no query and no recent searches', () => {
    render(<PlaylistSearchSheet onClose={vi.fn()} />)
    expect(screen.getByText(/Search for any YouTube playlist/i)).toBeTruthy()
  })

  it('submitting a search calls searchPlaylists and shows results', async () => {
    mockSearchPlaylists.mockResolvedValue({ playlists: samplePlaylists, nextPageToken: null })
    const onClose = vi.fn()
    render(<PlaylistSearchSheet onClose={onClose} />)

    const input = screen.getByPlaceholderText(/Search YouTube playlists/i)
    fireEvent.change(input, { target: { value: 'top hits' } })

    await act(async () => {
      fireEvent.submit(input.closest('form'))
    })

    await waitFor(() => {
      expect(screen.getByText('Top Hits 2024')).toBeTruthy()
      expect(screen.getByText('Chill Vibes')).toBeTruthy()
    })

    expect(mockSearchPlaylists).toHaveBeenCalledWith('top hits')
  })

  it('shows playlist item count and channel in card meta', async () => {
    mockSearchPlaylists.mockResolvedValue({ playlists: samplePlaylists, nextPageToken: null })
    render(<PlaylistSearchSheet onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Search YouTube playlists/i), { target: { value: 'hits' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/Search YouTube playlists/i).closest('form')) })

    await waitFor(() => {
      expect(screen.getByText(/Music Channel/)).toBeTruthy()
      expect(screen.getByText(/30 tracks/)).toBeTruthy()
    })
  })

  it('clicking a playlist fetches tracks, calls playQueue, and closes', async () => {
    mockSearchPlaylists.mockResolvedValue({ playlists: [samplePlaylists[0]], nextPageToken: null })
    mockFetchPlaylistTracks.mockResolvedValue(sampleTracks)
    const onClose = vi.fn()
    render(<PlaylistSearchSheet onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText(/Search YouTube playlists/i), { target: { value: 'top hits' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/Search YouTube playlists/i).closest('form')) })

    await waitFor(() => screen.getByText('Top Hits 2024'))

    await act(async () => {
      fireEvent.click(screen.getByText('Top Hits 2024').closest('button'))
    })

    await waitFor(() => {
      expect(mockFetchPlaylistTracks).toHaveBeenCalledWith('pl1')
      expect(mockPlayQueue).toHaveBeenCalledWith(sampleTracks, 0)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error message when searchPlaylists rejects', async () => {
    mockSearchPlaylists.mockRejectedValue(new Error('Quota exceeded'))
    render(<PlaylistSearchSheet onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Search YouTube playlists/i), { target: { value: 'hits' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/Search YouTube playlists/i).closest('form')) })

    await waitFor(() => {
      expect(screen.getByText('Quota exceeded')).toBeTruthy()
    })
  })

  it('shows no results message when search returns empty list', async () => {
    mockSearchPlaylists.mockResolvedValue({ playlists: [], nextPageToken: null })
    render(<PlaylistSearchSheet onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Search YouTube playlists/i), { target: { value: 'xyznotfound' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/Search YouTube playlists/i).closest('form')) })

    await waitFor(() => {
      expect(screen.getByText(/No playlists found/i)).toBeTruthy()
    })
  })

  it('shows error when fetchPlaylistTracks returns empty tracks', async () => {
    mockSearchPlaylists.mockResolvedValue({ playlists: [samplePlaylists[0]], nextPageToken: null })
    mockFetchPlaylistTracks.mockResolvedValue([])
    const onClose = vi.fn()
    render(<PlaylistSearchSheet onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText(/Search YouTube playlists/i), { target: { value: 'hits' } })
    await act(async () => { fireEvent.submit(screen.getByPlaceholderText(/Search YouTube playlists/i).closest('form')) })

    await waitFor(() => screen.getByText('Top Hits 2024'))
    await act(async () => { fireEvent.click(screen.getByText('Top Hits 2024').closest('button')) })

    await waitFor(() => {
      expect(screen.getByText(/empty or private/i)).toBeTruthy()
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
