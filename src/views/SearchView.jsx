import { useState } from 'react'
import { youtubeProvider } from '../providers/youtubeProvider.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import SearchBar from '../components/SearchBar.jsx'
import TrackItem from '../components/TrackItem.jsx'
import './SearchView.css'

export default function SearchView() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const { playQueue } = usePlayer()

  async function handleSearch(query) {
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const tracks = await youtubeProvider.search(query)
      setResults(tracks)
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="search-view">
      <SearchBar onSearch={handleSearch} loading={loading} />

      <div className="search-results">
        {loading && <p className="search-status">Searching…</p>}
        {error && <p className="search-status error">{error}</p>}
        {!loading && searched && results.length === 0 && !error && (
          <p className="search-status">No results found.</p>
        )}
        {!searched && !loading && (
          <div className="search-empty">
            <p>Search for any song or artist to start listening.</p>
          </div>
        )}
        {results.map((track, i) => (
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
