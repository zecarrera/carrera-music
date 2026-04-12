import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

const STORAGE_KEY = 'cm_playlists'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(playlists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists))
  } catch { /* ignore localStorage errors */ }
}

function makeLocalId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return action.playlists

    case 'CREATE':
      return [...state, { id: action.id, name: action.name, tracks: [], createdAt: Date.now() }]

    case 'RENAME':
      return state.map(pl => pl.id === action.id ? { ...pl, name: action.name } : pl)

    case 'DELETE':
      return state.filter(pl => pl.id !== action.id)

    case 'ADD_TRACK': {
      return state.map(pl => {
        if (pl.id !== action.playlistId) return pl
        if (pl.tracks.some(t => t.id === action.track.id)) return pl
        return { ...pl, tracks: [...pl.tracks, action.track] }
      })
    }

    case 'REMOVE_TRACK':
      return state.map(pl =>
        pl.id === action.playlistId
          ? { ...pl, tracks: pl.tracks.filter(t => t.id !== action.trackId) }
          : pl
      )

    case 'REORDER_TRACK': {
      return state.map(pl => {
        if (pl.id !== action.playlistId) return pl
        const tracks = [...pl.tracks]
        const [moved] = tracks.splice(action.from, 1)
        tracks.splice(action.to, 0, moved)
        return { ...pl, tracks }
      })
    }

    default:
      return state
  }
}

// ── Supabase helpers ────────────────────────────────────────────────────────

async function fetchRemotePlaylists(userId) {
  const { data: pls, error } = await supabase
    .from('playlists')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error

  const result = []
  for (const pl of pls) {
    const { data: tracks, error: te } = await supabase
      .from('playlist_tracks')
      .select('track_id, title, artist, thumbnail, thumbnail_medium, duration, position')
      .eq('playlist_id', pl.id)
      .order('position')
    if (te) throw te
    result.push({
      id: pl.id,
      name: pl.name,
      createdAt: new Date(pl.created_at).getTime(),
      tracks: tracks.map(t => ({
        id: t.track_id,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        thumbnailMedium: t.thumbnail_medium,
        duration: t.duration,
      })),
    })
  }
  return result
}

const PlaylistContext = createContext(null)

export function PlaylistProvider({ children }) {
  const { user } = useAuth()
  const [playlists, dispatch] = useReducer(reducer, [], loadFromStorage)
  // Prevents the initial remote SET from wiping optimistic mutations that
  // land between component mount and the fetch resolving (race condition).
  const hasMutatedRef = useRef(false)
  // Track whether we've synced from remote at least once
  const syncedRef = useRef(false)

  // Persist to localStorage on every change
  useEffect(() => saveToStorage(playlists), [playlists])

  // Load from Supabase when user is ready
  useEffect(() => {
    if (!supabase || !user || syncedRef.current) return
    syncedRef.current = true
    fetchRemotePlaylists(user.id)
      .then(remote => {
        // Skip if user already made mutations while the fetch was in-flight
        if (!hasMutatedRef.current) {
          dispatch({ type: 'SET', playlists: remote })
        }
      })
      .catch(err => console.warn('Failed to load playlists from Supabase:', err))
  }, [user])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createPlaylist = useCallback(async (name) => {
    hasMutatedRef.current = true

    if (supabase && user) {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ name, user_id: user.id })
        .select('id')
        .single()
      if (error) { console.warn('createPlaylist error:', error); return }
      dispatch({ type: 'CREATE', id: data.id, name })
    } else {
      dispatch({ type: 'CREATE', id: makeLocalId(), name })
    }
  }, [user])

  const renamePlaylist = useCallback(async (id, name) => {
    hasMutatedRef.current = true
    dispatch({ type: 'RENAME', id, name })
    if (supabase && user) {
      const { error } = await supabase.from('playlists').update({ name }).eq('id', id)
      if (error) console.warn('renamePlaylist error:', error)
    }
  }, [user])

  const deletePlaylist = useCallback(async (id) => {
    hasMutatedRef.current = true
    dispatch({ type: 'DELETE', id })
    if (supabase && user) {
      const { error } = await supabase.from('playlists').delete().eq('id', id)
      if (error) console.warn('deletePlaylist error:', error)
    }
  }, [user])

  const addTrack = useCallback(async (playlistId, track) => {
    hasMutatedRef.current = true
    dispatch({ type: 'ADD_TRACK', playlistId, track })
    if (supabase && user) {
      // Get current max position
      const pl = playlists.find(p => p.id === playlistId)
      const position = pl ? pl.tracks.length : 0
      const { error } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        thumbnail_medium: track.thumbnailMedium,
        duration: track.duration,
        position,
      })
      if (error) console.warn('addTrack error:', error)
    }
  }, [user, playlists])

  const removeTrack = useCallback(async (playlistId, trackId) => {
    hasMutatedRef.current = true
    dispatch({ type: 'REMOVE_TRACK', playlistId, trackId })
    if (supabase && user) {
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId)
      if (error) console.warn('removeTrack error:', error)
    }
  }, [user])

  const reorderTrack = useCallback(async (playlistId, from, to) => {
    dispatch({ type: 'REORDER_TRACK', playlistId, from, to })
    if (supabase && user) {
      // After reorder, get the updated playlist and re-write positions
      // We use the state AFTER dispatch — grab via callback pattern
      setTimeout(async () => {
        const pl = playlists.find(p => p.id === playlistId)
        if (!pl) return
        const reordered = [...pl.tracks]
        const [moved] = reordered.splice(from, 1)
        reordered.splice(to, 0, moved)
        for (let i = 0; i < reordered.length; i++) {
          await supabase
            .from('playlist_tracks')
            .update({ position: i })
            .eq('playlist_id', playlistId)
            .eq('track_id', reordered[i].id)
        }
      }, 0)
    }
  }, [user, playlists])

  const isTrackSaved = useCallback(
    (trackId) => playlists.some(pl => pl.tracks.some(t => t.id === trackId)),
    [playlists]
  )

  const removeTrackFromAll = useCallback((trackId) => {
    playlists.forEach(pl => {
      if (pl.tracks.some(t => t.id === trackId)) {
        removeTrack(pl.id, trackId)
      }
    })
  }, [playlists, removeTrack])

  return (
    <PlaylistContext.Provider value={{ playlists, createPlaylist, renamePlaylist, deletePlaylist, addTrack, removeTrack, removeTrackFromAll, isTrackSaved, reorderTrack }}>
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylists() {
  const ctx = useContext(PlaylistContext)
  if (!ctx) throw new Error('usePlaylists must be used inside PlaylistProvider')
  return ctx
}
