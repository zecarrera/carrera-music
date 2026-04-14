import { useState, useRef, useCallback, useEffect } from 'react'
import { youtubeProvider } from '../providers/youtubeProvider.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import './PlaylistSearchSheet.css'

const RECENT_KEY = 'cm_recent_playlist_searches'
const DEBOUNCE_MS = 400

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(searches) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(searches.slice(0, 6))) } catch { /* ignore */ }
}

export default function PlaylistSearchSheet({ onClose }) {
  const { playQueue } = usePlayer()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingPlaylist, setLoadingPlaylist] = useState(null)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [recent, setRecent] = useState(loadRecent)
  const [nextPageToken, setNextPageToken] = useState(null)
  const debounceRef = useRef(null)
  const activeQueryRef = useRef('')
  const sentinelRef = useRef(null)

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return
    setLoadingMore(true)
    try {
      const { playlists, nextPageToken: newToken } = await youtubeProvider.searchPlaylists(activeQueryRef.current, nextPageToken)
      setResults(prev => [...prev, ...playlists])
      setNextPageToken(newToken)
    } catch { /* silently ignore */ } finally {
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

  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim()
    if (!trimmed) return
    activeQueryRef.current = trimmed
    setLoading(true)
    setError(null)
    setSearched(true)
    setNextPageToken(null)
    try {
      const { playlists, nextPageToken: token } = await youtubeProvider.searchPlaylists(trimmed)
      setResults(playlists)
      setNextPageToken(token)
      setRecent(prev => {
        const next = [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, 6)
        saveRecent(next)
        return next
      })
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
      debounceRef.current = setTimeout(() => runSearch(val), DEBOUNCE_MS)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    runSearch(query)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
    setError(null)
    setNextPageToken(null)
  }

  async function handleSelectPlaylist(playlist) {
    if (loadingPlaylist) return
    setLoadingPlaylist(playlist.id)
    try {
      const tracks = await youtubeProvider.fetchPlaylistTracks(playlist.id)
      if (tracks.length > 0) {
        playQueue(tracks, 0)
        onClose()
      } else {
        setError('This playlist appears to be empty or private.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingPlaylist(null)
    }
  }

  return (
    <div className="pss-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pss-sheet" role="dialog" aria-label="Search YouTube playlists">
        <div className="pss-header">
          <h2 className="pss-title">Search Playlists</h2>
          <button className="pss-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="pss-search-bar" onSubmit={handleSubmit}>
          <input
            type="search"
            className="pss-search-input"
            placeholder="Search YouTube playlists…"
            value={query}
            onChange={handleInputChange}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className="pss-clear-btn" onClick={handleClear} aria-label="Clear">✕</button>
          )}
          <button type="submit" className="pss-search-btn" disabled={loading || !query.trim()}>
            {loading ? <span className="spin">⟳</span> : '🔍'}
          </button>
        </form>

        <div className="pss-results">
          {loading && (
            <div className="pss-skeleton-list">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="pss-skeleton-row">
                  <div className="pss-skeleton-thumb" />
                  <div className="pss-skeleton-text">
                    <div className="pss-skeleton-line long" />
                    <div className="pss-skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="pss-error">
              <span className="pss-error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && !error && (
            <p className="pss-status">No playlists found for &ldquo;{query}&rdquo;.</p>
          )}

          {!searched && !loading && recent.length > 0 && (
            <div className="pss-recent">
              <h3 className="pss-recent-title">Recent</h3>
              {recent.map(q => (
                <button key={q} className="pss-recent-item" onClick={() => { setQuery(q); runSearch(q) }}>
                  <span className="pss-recent-icon">🕐</span> {q}
                </button>
              ))}
            </div>
          )}

          {!searched && !loading && recent.length === 0 && (
            <div className="pss-empty">
              <p>Search for any YouTube playlist to start listening.</p>
            </div>
          )}

          {!loading && results.map(pl => (
            <button
              key={pl.id}
              className={`pss-playlist-card${loadingPlaylist === pl.id ? ' pss-playlist-card--loading' : ''}`}
              onClick={() => handleSelectPlaylist(pl)}
              disabled={!!loadingPlaylist}
            >
              <div className="pss-card-thumb">
                {pl.thumbnail
                  ? <img src={pl.thumbnail} alt="" className="pss-card-thumb-img" />
                  : <span className="pss-card-thumb-placeholder">🎵</span>
                }
              </div>
              <div className="pss-card-info">
                <span className="pss-card-title">{pl.title}</span>
                <span className="pss-card-meta">{pl.channelTitle}{pl.itemCount != null ? ` · ${pl.itemCount} tracks` : ''}</span>
              </div>
              <div className="pss-card-action">
                {loadingPlaylist === pl.id
                  ? <span className="spin">⟳</span>
                  : <span className="pss-play-icon">▶</span>
                }
              </div>
            </button>
          ))}

          {nextPageToken && <div ref={sentinelRef} className="pss-load-more-sentinel" />}
          {loadingMore && (
            <div className="pss-load-more-indicator">
              <span className="spin">⟳</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
