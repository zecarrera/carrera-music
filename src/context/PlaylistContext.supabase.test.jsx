/**
 * Tests the Supabase sync path — verifies that mutations call the
 * Supabase API when an anonymous user is present.
 *
 * Supabase is mocked with spies so no real network calls are made.
 * AuthContext is mocked to return a stable anonymous user.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { PlaylistProvider, usePlaylists } from '../context/PlaylistContext.jsx'

const ANON_USER_ID = 'anon-user-abc123'

// ── Hoisted mock state (must be defined before vi.mock hoisting) ─────────────
const captured = vi.hoisted(() => ({
  playlistInsert: null,
  trackInsert: null,
  playlistDelete: null,
  trackDelete: null,
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────
vi.mock('../lib/supabase.js', () => {
  const supabase = {
    from: vi.fn((table) => {
      if (table === 'playlists') {
        return {
          insert: vi.fn((data) => {
            captured.playlistInsert = data
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'pl-mock-id' }, error: null }),
              }),
            }
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn((col, val) => {
              captured.playlistDelete = { col, val }
              return Promise.resolve({ error: null })
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      // playlist_tracks table
      return {
        insert: vi.fn((data) => {
          captured.trackInsert = data
          return Promise.resolve({ error: null })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn((col1, val1) => {
            captured.trackDelete = { [col1]: val1 }
            return {
              eq: vi.fn((col2, val2) => {
                captured.trackDelete[col2] = val2
                return Promise.resolve({ error: null })
              }),
            }
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }
    }),
  }
  return { supabase }
})

// Mock AuthContext to return a stable anonymous user immediately
vi.mock('../context/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { id: ANON_USER_ID }, loading: false }),
}))

function wrapper({ children }) {
  return <PlaylistProvider>{children}</PlaylistProvider>
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PlaylistContext — Supabase sync (anonymous user)', () => {
  beforeEach(() => {
    localStorage.clear()
    captured.playlistInsert = null
    captured.trackInsert = null
    captured.playlistDelete = null
    captured.trackDelete = null
  })

  it('createPlaylist calls Supabase insert with name and user_id', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })

    await act(async () => {
      await result.current.createPlaylist('Road Trip')
    })

    expect(captured.playlistInsert).toMatchObject({
      name: 'Road Trip',
      user_id: ANON_USER_ID,
    })
  })

  it('createPlaylist adds the playlist to local state using Supabase-returned id', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })

    await act(async () => {
      await result.current.createPlaylist('Road Trip')
    })

    expect(result.current.playlists).toHaveLength(1)
    expect(result.current.playlists[0].id).toBe('pl-mock-id')
  })

  it('addTrack calls Supabase insert with full track data', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })

    await act(async () => { await result.current.createPlaylist('Favs') })
    const plId = result.current.playlists[0].id
    const track = {
      id: 'yt_abc',
      title: 'Everlong',
      artist: 'Foo Fighters',
      thumbnail: 'https://img.yt/default.jpg',
      thumbnailMedium: 'https://img.yt/medium.jpg',
      duration: 250,
    }

    await act(async () => { await result.current.addTrack(plId, track) })

    expect(captured.trackInsert).toMatchObject({
      playlist_id: plId,
      track_id: 'yt_abc',
      title: 'Everlong',
      artist: 'Foo Fighters',
      thumbnail: 'https://img.yt/default.jpg',
      thumbnail_medium: 'https://img.yt/medium.jpg',
      duration: 250,
    })
  })

  it('addTrack marks the track as saved immediately (optimistic)', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })

    await act(async () => { await result.current.createPlaylist('Favs') })
    const plId = result.current.playlists[0].id

    await act(async () => {
      await result.current.addTrack(plId, { id: 'yt_abc', title: 'Everlong', artist: 'Foo Fighters' })
    })

    expect(result.current.isTrackSaved('yt_abc')).toBe(true)
  })

  it('deletePlaylist calls Supabase delete with the playlist id', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })

    await act(async () => { await result.current.createPlaylist('Temp') })
    const plId = result.current.playlists[0].id

    await act(async () => { await result.current.deletePlaylist(plId) })

    expect(captured.playlistDelete).toMatchObject({ col: 'id', val: plId })
    expect(result.current.playlists).toHaveLength(0)
  })

  it('removeTrack calls Supabase delete with playlist_id and track_id', async () => {
    const { result } = renderHook(() => usePlaylists(), { wrapper })

    await act(async () => { await result.current.createPlaylist('Favs') })
    const plId = result.current.playlists[0].id
    const track = { id: 'yt_abc', title: 'Everlong', artist: 'Foo Fighters' }

    await act(async () => { await result.current.addTrack(plId, track) })
    await act(async () => { await result.current.removeTrack(plId, 'yt_abc') })

    expect(captured.trackDelete).toMatchObject({
      playlist_id: plId,
      track_id: 'yt_abc',
    })
    expect(result.current.isTrackSaved('yt_abc')).toBe(false)
  })
})

