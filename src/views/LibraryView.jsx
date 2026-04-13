import { useState } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import AuthModal from '../components/AuthModal.jsx'
import './LibraryView.css'

export default function LibraryView({ onOpenPlaylist }) {
  const { playlists, createPlaylist } = usePlaylists()
  const { user, isAnonymous, signOut } = useAuth()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [authModal, setAuthModal] = useState(null) // 'signin' | 'signup' | null

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

      <div className="library-auth-row">
        {isAnonymous ? (
          <>
            <span className="library-auth-label">🔒 Anonymous</span>
            <button className="library-auth-cta" onClick={() => setAuthModal('signup')}>
              Create account
            </button>
            <button className="library-auth-link" onClick={() => setAuthModal('signin')}>
              Sign in
            </button>
          </>
        ) : (
          <>
            <span className="library-auth-label">📧 {user?.email}</span>
            <button className="library-auth-link" onClick={signOut}>
              Sign out
            </button>
          </>
        )}
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
            <span className="playlist-chevron">›</span>
          </li>
        ))}
      </ul>

      {authModal && (
        <AuthModal
          initialTab={authModal}
          onDismiss={() => setAuthModal(null)}
        />
      )}
    </div>
  )
}
