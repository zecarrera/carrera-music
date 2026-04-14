import { useState } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import { usePlayer } from '../context/PlayerContext.jsx'
import './LibraryView.css'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function LibraryView({ onOpenPlaylist }) {
  const { playlists, createPlaylist } = usePlaylists()
  const { playQueue } = usePlayer()
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
            type="text"
            placeholder="Playlist name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="new-playlist-input"
          />
          <div className="new-playlist-form-row">
            <button type="submit" disabled={!newName.trim()} style={{ flex: 1 }}>Create</button>
            <button type="button" onClick={() => setCreating(false)} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      )}

      {playlists.length === 0 && !creating && (
        <div className="library-empty">
          <div className="library-empty-icon">🎵</div>
          <p>Your library is empty.</p>
          <p>Tap <strong>＋ New</strong> to create a playlist, then search for songs to add.</p>
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
            {pl.tracks.length > 0 && (
              <div className="playlist-card-actions">
                <button
                  className="playlist-play-btn"
                  aria-label="Play all"
                  onClick={e => { e.stopPropagation(); playQueue(pl.tracks, 0) }}
                >▶</button>
                <button
                  className="playlist-shuffle-btn"
                  aria-label="Shuffle play"
                  onClick={e => { e.stopPropagation(); playQueue(shuffleArray(pl.tracks), 0) }}
                >🔀</button>
              </div>
            )}
            <span className="playlist-chevron">›</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
