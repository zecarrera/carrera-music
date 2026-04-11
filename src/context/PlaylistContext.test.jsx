import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { PlaylistProvider, usePlaylists } from '../context/PlaylistContext.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

function wrapper({ children }) {
  return <AuthProvider><PlaylistProvider>{children}</PlaylistProvider></AuthProvider>
}

describe('PlaylistContext', () => {
  beforeEach(() => localStorage.clear())

  it('starts with empty playlists', () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    expect(result.current.playlists).toEqual([])
  })

  it('createPlaylist adds a playlist', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await act(async () => {
      await result.current.createPlaylist('My List')
    })
    expect(result.current.playlists).toHaveLength(1)
    expect(result.current.playlists[0].name).toBe('My List')
  })

  it('addTrack adds a track to the right playlist', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await act(async () => { await result.current.createPlaylist('My List') })
    const plId = result.current.playlists[0].id
    const track = { id: 'yt1', title: 'Song', artist: 'Artist' }
    await act(async () => { await result.current.addTrack(plId, track) })
    expect(result.current.playlists[0].tracks).toHaveLength(1)
  })

  it('isTrackSaved returns true after adding a track', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await act(async () => { await result.current.createPlaylist('My List') })
    const plId = result.current.playlists[0].id
    const track = { id: 'yt1', title: 'Song', artist: 'Artist' }
    await act(async () => { await result.current.addTrack(plId, track) })
    expect(result.current.isTrackSaved('yt1')).toBe(true)
    expect(result.current.isTrackSaved('yt99')).toBe(false)
  })

  it('removeTrackFromAll removes track from every playlist containing it', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await act(async () => {
      await result.current.createPlaylist('List 1')
      await result.current.createPlaylist('List 2')
    })
    const [pl1, pl2] = result.current.playlists
    const track = { id: 'yt1', title: 'Song', artist: 'Artist' }
    await act(async () => {
      await result.current.addTrack(pl1.id, track)
      await result.current.addTrack(pl2.id, track)
    })
    expect(result.current.isTrackSaved('yt1')).toBe(true)
    act(() => result.current.removeTrackFromAll('yt1'))
    expect(result.current.isTrackSaved('yt1')).toBe(false)
  })

  it('deletePlaylist removes the playlist', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await act(async () => { await result.current.createPlaylist('Temp') })
    const plId = result.current.playlists[0].id
    await act(async () => { await result.current.deletePlaylist(plId) })
    expect(result.current.playlists).toHaveLength(0)
  })

  it('persists playlists to localStorage', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await act(async () => { await result.current.createPlaylist('Persisted') })
    const stored = JSON.parse(localStorage.getItem('cm_playlists'))
    expect(stored[0].name).toBe('Persisted')
  })
})
