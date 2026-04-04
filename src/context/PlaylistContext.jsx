import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'

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
  } catch { /* quota exceeded — silently ignore */ }
}

function makeId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function reducer(state, action) {
  switch (action.type) {
    case 'CREATE':
      return [...state, { id: makeId(), name: action.name, tracks: [], createdAt: Date.now() }]

    case 'RENAME':
      return state.map(pl => pl.id === action.id ? { ...pl, name: action.name } : pl)

    case 'DELETE':
      return state.filter(pl => pl.id !== action.id)

    case 'ADD_TRACK': {
      return state.map(pl => {
        if (pl.id !== action.playlistId) return pl
        // Avoid duplicates
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

const PlaylistContext = createContext(null)

export function PlaylistProvider({ children }) {
  const [playlists, dispatch] = useReducer(reducer, [], loadFromStorage)

  useEffect(() => saveToStorage(playlists), [playlists])

  const createPlaylist = useCallback((name) => dispatch({ type: 'CREATE', name }), [])
  const renamePlaylist = useCallback((id, name) => dispatch({ type: 'RENAME', id, name }), [])
  const deletePlaylist = useCallback((id) => dispatch({ type: 'DELETE', id }), [])
  const addTrack = useCallback((playlistId, track) => dispatch({ type: 'ADD_TRACK', playlistId, track }), [])
  const removeTrack = useCallback((playlistId, trackId) => dispatch({ type: 'REMOVE_TRACK', playlistId, trackId }), [])
  const reorderTrack = useCallback((playlistId, from, to) => dispatch({ type: 'REORDER_TRACK', playlistId, from, to }), [])

  return (
    <PlaylistContext.Provider value={{ playlists, createPlaylist, renamePlaylist, deletePlaylist, addTrack, removeTrack, reorderTrack }}>
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylists() {
  const ctx = useContext(PlaylistContext)
  if (!ctx) throw new Error('usePlaylists must be used inside PlaylistProvider')
  return ctx
}
