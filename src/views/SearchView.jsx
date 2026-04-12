import { useState, useRef, useCallback } from 'react'
import { youtubeProvider } from '../providers/youtubeProvider.js'
import TrackItem from '../components/TrackItem.jsx'
import './SearchView.css'

const RECENT_KEY = 'cm_recent_searches'
const DEBOUNCE_MS = 400

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(searches) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(searches.slice(0, 6))) } catch { /* ignore */ }
}

export default function SearchView() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const [recent, setRecent] = useState(loadRecent)
  const debounceRef = useRef(null)

  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const tracks = await youtubeProvider.search(trimmed)
      setResults(tracks)
      // Save to recent
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
  }

  function handleRecent(q) {
    setQuery(q)
    runSearch(q)
  }

  return (
    <div className="search-view">
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="search"
          className="search-input"
          placeholder="Search songs, artists…"
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
          <p className="search-status">No results found for &ldquo;{query}&rdquo;.</p>
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
            <p>Search for any song or artist to start listening.</p>
          </div>
        )}

        {!loading && results.map((track, i) => (
          <TrackItem
            key={track.id}
            track={track}
            queue={results}
            queueIndex={i}
            showAdd
          />
        ))}
      </div>
    </div>
  )
}
