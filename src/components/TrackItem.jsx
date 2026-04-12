import { usePlayer } from '../context/PlayerContext.jsx'
import AddToPlaylistBtn from './AddToPlaylistBtn.jsx'
import './TrackItem.css'

function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export default function TrackItem({ track, queue, queueIndex, showAdd = false, showRemove = false, onRemove, draggable = false, onDragStart, onDragOver, onDrop }) {
  const { playQueue, currentTrack, isPlaying } = usePlayer()
  const isActive = currentTrack?.id === track.id

  function handlePlay() {
    if (queue) {
      playQueue(queue, queueIndex ?? 0)
    } else {
      playQueue([track], 0)
    }
  }

  return (
    <div
      className={`track-item ${isActive ? 'active' : ''}`}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="track-play-btn" aria-hidden="true">
        {isActive && isPlaying ? (
          <span className="playing-indicator">▶</span>
        ) : (
          track.thumbnail
            ? <img className="track-thumb" src={track.thumbnail} alt={track.title} loading="lazy" />
            : <span className="track-thumb-placeholder">♪</span>
        )}
      </div>

      <div className="track-info">
        <span className="track-title">{track.title}</span>
        <span className="track-meta">{track.artist}{track.duration ? ` · ${formatDuration(track.duration)}` : ''}</span>
      </div>

      <div className="track-actions" onClick={e => e.stopPropagation()}>
        {showAdd && <AddToPlaylistBtn track={track} />}
        {showRemove && (
          <button className="icon-btn remove-btn" onClick={onRemove} aria-label="Remove">✕</button>
        )}
      </div>
    </div>
  )
}
