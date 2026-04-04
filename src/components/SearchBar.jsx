import { useState } from 'react'
import './SearchBar.css'

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="search"
        className="search-input"
        placeholder="Search songs, artists…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
        {loading ? '…' : '🔍'}
      </button>
    </form>
  )
}
