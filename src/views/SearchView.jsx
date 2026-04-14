import { useState, useRef, useCallback, useEffect } from 'react'
import { youtubeProvider } from '../providers/youtubeProvider.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import TrackItem from '../components/TrackItem.jsx'
import './SearchView.css'

const RECENT_SONGS_KEY = 'cm_recent_searches'
const RECENT_PLAYLISTS_KEY = 'cm_recent_playlist_searches'
const DEBOUNCE_MS = 400

function loadRecent(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}
function saveRecent(key, searches) {
  try { localStorage.setItem(key, JSON.stringify(searches.slice(0, 6))) } catch { /* ignore */ }
}

export default function SearchView() {
  const { playQueue } = usePlayer()
  const [mode, setMode] = useState('songs') // 'songs' | 'playlists'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingPlaylist, setLoadingPlaylist] = useState(null)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [recentSongs, setRecentSongs] = useState(() => loadRecent(RECENT_SONGS_KEY))
  const [recentPlaylists, setRecentPlaylists] = useState(() => loadRecent(RECENT_PLAYLISTS_KEY))
  const [nextPageToken, setNextPageToken] = useState(null)
  const debounceRef = useRef(null)
  const activeQueryRef = useRef('')
  const modeRef = useRef(mode)
  const sentinelRef = useRef(null)

  useEffect(() => { modeRef.current = mode }, [mode])

  const recent = mode === 'songs' ? recentSongs : recentPlaylists

  function resetSearch() {
    clearTimeout(debounceRef.current)
    setQuery('')
    setResults([])
    setSearched(false)
    setError(null)
    setNextPageToken(null)
  }

  function handleModeChange(newMode) {
    if (newMode === mode) return
    resetSearch()
    setMode(newMode)
  }

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return
    setLoadingMore(true)
    try {
      const q = activeQueryRef.current
      if (modeRef.current === 'songs') {
        const { tracks, nextPageToken: newToken } = await youtubeProvider.search(q, nextPageToken)
        setResults(prev => [...prev, ...tracks])
        setNextPageToken(newToken)
      } else {
        const { playlists, nextPageToken: newToken } = await youtubeProvider.searchPlaylists(q, nextPageToken)
        setResults(prev => [...prev, ...playlists])
        setNextPageToken(newToken)
      }
    } catch { /* silently ignore load-more failures */ } finally {
      setLoadingMore(false)
    }
  }, [nextPageToken, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '120px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const runSearch = useCallback(async (q, searchMode) => {
    const trimmed = q.trim()
    if (!trimmed) return
    activeQueryRef.current = trimmed
    setLoading(true)
    setError(null)
    setSearched(true)
    setNextPageToken(null)
    try {
      if (searchMode === 'songs') {
        const { tracks, nextPageToken: token } = await youtubeProvider.search(trimmed)
        setResults(tracks)
        setNextPageToken(token)
        setRecentSongs(prev => {
          const next = [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, 6)
          saveRecent(RECENT_SONGS_KEY, next)
          return next
        })
      } else {
        const { playlists, nextPageToken: token } = await youtubeProvider.searchPlaylists(trimmed)
        setResults(playlists)
        setNextPageToken(token)
        setRecentPlaylists(prev => {
          const next = [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, 6)
          saveRecent(RECENT_PLAYLISTS_KEY, next)
          return next
        })
      }
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(() => runSearch(val, modeRef.current), DEBOUNCE_MS)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    runSearch(query, mode)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
    setError(null)
    setNextPageToken(null)
  }

  function handleRecent(q) {
    setQuery(q)
    runSearch(q, mode)
  }

  async function handleSelectPlaylist(playlist) {
    if (loadingPlaylist) return
    setLoadingPlaylist(playlist.id)
    try {
      const tracks = await youtubeProvider.fetchPlaylistTracks(playlist.id)
      if (tracks.length > 0) {
        playQueue(tracks, 0)
      } else {
        setError('This playlist appears to be empty or private.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingPlaylist(null)
    }
  }

  const isSongs = mode === 'songs'
  const placeholder = isSongs ? 'Search songs, artists…' : 'Search playlists…'
  const emptyHint = isSongs
    ? 'Search for any song or artist to start listening.'
    : 'Search for any YouTube playlist to start listening.'
  const noResultsMsg = isSongs
    ? `No results found for "${query}".`
    : `No playlists found for "${query}".`

  return (
    <div className="search-view">
      <div className="search-header">
        <form className="search-bar" onSubmit={handleSubmit}>
          <input
            type="search"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className="clear-btn" onClick={handleClear} aria-label="Clear">✕</button>
          )}
          <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
            {loading ? <span className="spin">⟳</span> : '🔍'}
          </button>
        </form>

        <div className="search-mode-toggle" role="tablist" aria-label="Search mode">
          <button
            role="tab"
            aria-selected={isSongs}
            className={`mode-tab${isSongs ? ' mode-tab--active' : ''}`}
            onClick={() => handleModeChange('songs')}
          >
            Songs
          </button>
          <button
            role="tab"
            aria-selected={!isSongs}
            className={`mode-tab${!isSongs ? ' mode-tab--active' : ''}`}
            onClick={() => handleModeChange('playlists')}
          >
            Playlists
          </button>
        </div>
      </div>

      <div className="search-results">
        {loading && (
          <div className="skeleton-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-thumb" />
                <div className="skeleton-text">
                  <div className="skeleton-line long" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="search-error">
            <span className="search-error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <p className="search-status">{noResultsMsg}</p>
        )}

        {!searched && !loading && recent.length > 0 && (
          <div className="recent-searches">
            <h3 className="recent-title">Recent</h3>
            {recent.map(q => (
              <button key={q} className="recent-item" onClick={() => handleRecent(q)}>
                <span className="recent-icon">🕐</span> {q}
              </button>
            ))}
          </div>
        )}

        {!searched && !loading && recent.length === 0 && (
          <div className="search-empty">
            <p>{emptyHint}</p>
          </div>
        )}

        {!loading && isSongs && results.map((track, i) => (
          <TrackItem
            key={track.id}
            track={track}
            queue={results}
            queueIndex={i}
            showAdd
          />
        ))}

        {!loading && !isSongs && results.map(pl => (
          <button
            key={pl.id}
            className={`sv-playlist-card${loadingPlaylist === pl.id ? ' sv-playlist-card--loading' : ''}`}
            onClick={() => handleSelectPlaylist(pl)}
            disabled={!!loadingPlaylist}
          >
            <div className="sv-card-thumb">
              {pl.thumbnail
                ? <img src={pl.thumbnail} alt="" className="sv-card-thumb-img" />
                : <span className="sv-card-thumb-placeholder">🎵</span>
              }
            </div>
            <div className="sv-card-info">
              <span className="sv-card-title">{pl.title}</span>
              <span className="sv-card-meta">{pl.channelTitle}{pl.itemCount != null ? ` · ${pl.itemCount} tracks` : ''}</span>
            </div>
            <div className="sv-card-action">
              {loadingPlaylist === pl.id
                ? <span className="spin">⟳</span>
                : <span className="sv-play-icon">▶</span>
              }
            </div>
          </button>
        ))}

        {nextPageToken && <div ref={sentinelRef} className="load-more-sentinel" />}
        {loadingMore && (
          <div className="load-more-indicator">
            <span className="spin">⟳</span>
          </div>
        )}
      </div>
    </div>
  )
}
