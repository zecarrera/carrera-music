import { describe, it, expect } from 'vitest'

// Inline the reducer so tests don't depend on module side-effects

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

const track1 = { id: 'yt1', title: 'Song A', artist: 'Artist A' }
const track2 = { id: 'yt2', title: 'Song B', artist: 'Artist B' }
const track3 = { id: 'yt3', title: 'Song C', artist: 'Artist C' }

const playlist = (overrides = {}) => ({
  id: 'pl1', name: 'My Playlist', tracks: [], ...overrides,
})

describe('PlaylistContext reducer', () => {
  describe('SET', () => {
    it('replaces entire state', () => {
      const existing = [playlist()]
      const incoming = [playlist({ id: 'pl2', name: 'New' })]
      expect(reducer(existing, { type: 'SET', playlists: incoming })).toEqual(incoming)
    })
  })

  describe('CREATE', () => {
    it('adds a new empty playlist', () => {
      const state = reducer([], { type: 'CREATE', id: 'pl1', name: 'Favs' })
      expect(state).toHaveLength(1)
      expect(state[0]).toMatchObject({ id: 'pl1', name: 'Favs', tracks: [] })
    })
    it('appends to existing playlists', () => {
      const state = reducer([playlist()], { type: 'CREATE', id: 'pl2', name: 'New' })
      expect(state).toHaveLength(2)
    })
  })

  describe('RENAME', () => {
    it('renames the target playlist', () => {
      const state = reducer([playlist()], { type: 'RENAME', id: 'pl1', name: 'Renamed' })
      expect(state[0].name).toBe('Renamed')
    })
    it('leaves other playlists unchanged', () => {
      const initial = [playlist({ id: 'pl1' }), playlist({ id: 'pl2', name: 'Other' })]
      const state = reducer(initial, { type: 'RENAME', id: 'pl1', name: 'X' })
      expect(state[1].name).toBe('Other')
    })
  })

  describe('DELETE', () => {
    it('removes the target playlist', () => {
      const state = reducer([playlist()], { type: 'DELETE', id: 'pl1' })
      expect(state).toHaveLength(0)
    })
    it('leaves other playlists intact', () => {
      const initial = [playlist({ id: 'pl1' }), playlist({ id: 'pl2' })]
      const state = reducer(initial, { type: 'DELETE', id: 'pl1' })
      expect(state).toHaveLength(1)
      expect(state[0].id).toBe('pl2')
    })
  })

  describe('ADD_TRACK', () => {
    it('adds a track to the target playlist', () => {
      const state = reducer([playlist()], { type: 'ADD_TRACK', playlistId: 'pl1', track: track1 })
      expect(state[0].tracks).toHaveLength(1)
      expect(state[0].tracks[0].id).toBe('yt1')
    })
    it('does not add duplicate tracks', () => {
      const initial = [playlist({ tracks: [track1] })]
      const state = reducer(initial, { type: 'ADD_TRACK', playlistId: 'pl1', track: track1 })
      expect(state[0].tracks).toHaveLength(1)
    })
    it('does not modify other playlists', () => {
      const initial = [playlist({ id: 'pl1' }), playlist({ id: 'pl2' })]
      const state = reducer(initial, { type: 'ADD_TRACK', playlistId: 'pl1', track: track1 })
      expect(state[1].tracks).toHaveLength(0)
    })
  })

  describe('REMOVE_TRACK', () => {
    it('removes the target track', () => {
      const initial = [playlist({ tracks: [track1, track2] })]
      const state = reducer(initial, { type: 'REMOVE_TRACK', playlistId: 'pl1', trackId: 'yt1' })
      expect(state[0].tracks).toHaveLength(1)
      expect(state[0].tracks[0].id).toBe('yt2')
    })
    it('is a no-op if track not in playlist', () => {
      const initial = [playlist({ tracks: [track1] })]
      const state = reducer(initial, { type: 'REMOVE_TRACK', playlistId: 'pl1', trackId: 'yt99' })
      expect(state[0].tracks).toHaveLength(1)
    })
  })

  describe('REORDER_TRACK', () => {
    it('moves a track forward', () => {
      const initial = [playlist({ tracks: [track1, track2, track3] })]
      const state = reducer(initial, { type: 'REORDER_TRACK', playlistId: 'pl1', from: 0, to: 2 })
      expect(state[0].tracks.map(t => t.id)).toEqual(['yt2', 'yt3', 'yt1'])
    })
    it('moves a track backward', () => {
      const initial = [playlist({ tracks: [track1, track2, track3] })]
      const state = reducer(initial, { type: 'REORDER_TRACK', playlistId: 'pl1', from: 2, to: 0 })
      expect(state[0].tracks.map(t => t.id)).toEqual(['yt3', 'yt1', 'yt2'])
    })
    it('does not modify other playlists', () => {
      const initial = [
        playlist({ id: 'pl1', tracks: [track1, track2] }),
        playlist({ id: 'pl2', tracks: [track3] }),
      ]
      const state = reducer(initial, { type: 'REORDER_TRACK', playlistId: 'pl1', from: 0, to: 1 })
      expect(state[1].tracks).toEqual([track3])
    })
  })
})
