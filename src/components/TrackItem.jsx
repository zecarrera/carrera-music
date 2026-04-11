import { useState } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import { usePlayer } from '../context/PlayerContext.jsx'
import './TrackItem.css'

function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export default function TrackItem({ track, queue, queueIndex, showAdd = false, showRemove = false, onRemove, draggable = false, onDragStart, onDragOver, onDrop }) {
  const { playQueue, currentTrack, isPlaying } = usePlayer()
  const { playlists, addTrack } = usePlaylists()
  const [showMenu, setShowMenu] = useState(false)

  const isActive = currentTrack?.id === track.id

  function handlePlay() {
    if (queue) {
      playQueue(queue, queueIndex ?? 0)
    } else {
      playQueue([track], 0)
    }
  }

  function handleAddTo(playlistId) {
    addTrack(playlistId, track)
    setShowMenu(false)
  }

  return (
    <div
      className={`track-item ${isActive ? 'active' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
        <button className="track-play-btn" onClick={handlePlay} aria-label="Play">
          {isActive && isPlaying ? (
            <span className="playing-indicator">▶</span>
          ) : (
            track.thumbnail
              ? <img className="track-thumb" src={track.thumbnail} alt={track.title} loading="lazy" />
              : <span className="track-thumb-placeholder">♪</span>
          )}
        </button>

      <div className="track-info">
        <span className="track-title">{track.title}</span>
        <span className="track-meta">{track.artist}{track.duration ? ` · ${formatDuration(track.duration)}` : ''}</span>
      </div>

      <div className="track-actions">
        {showAdd && (
          <div className="add-menu-wrap">
            <button
              className="icon-btn"
              onClick={() => setShowMenu(v => !v)}
              aria-label="Add to playlist"
            >＋</button>
            {showMenu && (
              <div className="add-menu">
                {playlists.length === 0 && <span className="add-menu-empty">No playlists yet</span>}
                {playlists.map(pl => (
                  <button key={pl.id} className="add-menu-item" onClick={() => handleAddTo(pl.id)}>
                    {pl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {showRemove && (
          <button className="icon-btn remove-btn" onClick={onRemove} aria-label="Remove">✕</button>
        )}
      </div>
    </div>
  )
}
