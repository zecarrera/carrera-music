import { useState } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import './LibraryView.css'

export default function LibraryView({ onOpenPlaylist }) {
  const { playlists, createPlaylist } = usePlaylists()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    createPlaylist(newName.trim())
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="library-view">
      <div className="library-header">
        <h2 className="library-title">Your Library</h2>
        <button className="new-playlist-btn" onClick={() => setCreating(v => !v)}>＋ New</button>
      </div>

      {creating && (
        <form className="new-playlist-form" onSubmit={handleCreate}>
          <input
            autoFocus
            type="text"
            placeholder="Playlist name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="new-playlist-input"
          />
          <button type="submit" disabled={!newName.trim()}>Create</button>
          <button type="button" onClick={() => setCreating(false)}>Cancel</button>
        </form>
      )}

      {playlists.length === 0 && !creating && (
        <div className="library-empty">
          <p>No playlists yet.</p>
          <p>Tap <strong>＋ New</strong> to create one, then add tracks from Search.</p>
        </div>
      )}

      <ul className="playlist-list">
        {playlists.map(pl => (
          <li key={pl.id} className="playlist-card" onClick={() => onOpenPlaylist(pl.id)}>
            <div className="playlist-icon">🎵</div>
            <div className="playlist-info">
              <span className="playlist-name">{pl.name}</span>
              <span className="playlist-count">{pl.tracks.length} track{pl.tracks.length !== 1 ? 's' : ''}</span>
            </div>
            <span className="playlist-chevron">›</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
