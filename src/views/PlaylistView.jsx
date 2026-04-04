import { useState } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import { usePlayer } from '../context/PlayerContext.jsx'
import TrackItem from '../components/TrackItem.jsx'
import './PlaylistView.css'

export default function PlaylistView({ playlistId, onBack }) {
  const { playlists, renamePlaylist, deletePlaylist, removeTrack, reorderTrack } = usePlaylists()
  const { playQueue } = usePlayer()
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [dragFrom, setDragFrom] = useState(null)

  const playlist = playlists.find(p => p.id === playlistId)
  if (!playlist) { onBack(); return null }

  function handleRename(e) {
    e.preventDefault()
    if (!newName.trim()) return
    renamePlaylist(playlistId, newName.trim())
    setRenaming(false)
  }

  function handleDelete() {
    if (confirm(`Delete "${playlist.name}"?`)) {
      deletePlaylist(playlistId)
      onBack()
    }
  }

  function handleDragStart(index) { setDragFrom(index) }

  function handleDrop(index) {
    if (dragFrom !== null && dragFrom !== index) {
      reorderTrack(playlistId, dragFrom, index)
    }
    setDragFrom(null)
  }

  return (
    <div className="playlist-view">
      <div className="playlist-view-header">
        <button className="back-btn" onClick={onBack}>‹ Back</button>
        <div className="playlist-view-title">
          {renaming ? (
            <form onSubmit={handleRename} className="rename-form">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="rename-input"
              />
              <button type="submit">Save</button>
              <button type="button" onClick={() => setRenaming(false)}>Cancel</button>
            </form>
          ) : (
            <h2 className="playlist-view-name" onClick={() => { setNewName(playlist.name); setRenaming(true) }}>
              {playlist.name} ✎
            </h2>
          )}
        </div>
        <button className="delete-btn" onClick={handleDelete}>🗑</button>
      </div>

      {playlist.tracks.length === 0 ? (
        <div className="playlist-empty">
          <p>No tracks yet.</p>
          <p>Search for a song and tap <strong>＋</strong> to add it here.</p>
        </div>
      ) : (
        <>
          <div className="playlist-play-all">
            <button className="play-all-btn" onClick={() => playQueue(playlist.tracks, 0)}>
              ▶ Play All ({playlist.tracks.length})
            </button>
          </div>
          <ul className="playlist-track-list">
            {playlist.tracks.map((track, i) => (
              <li key={track.id}>
                <TrackItem
                  track={track}
                  queue={playlist.tracks}
                  queueIndex={i}
                  showRemove
                  onRemove={() => removeTrack(playlistId, track.id)}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
