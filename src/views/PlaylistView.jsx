import { useState, useRef } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import { usePlayer } from '../context/PlayerContext.jsx'
import TrackItem from '../components/TrackItem.jsx'
import './PlaylistView.css'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PlaylistView({ playlistId, onBack }) {
  const { playlists, renamePlaylist, deletePlaylist, removeTrack, reorderTrack } = usePlaylists()
  const { playQueue } = usePlayer()
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)
  const dragRef = useRef({ active: false, fromIndex: null, toIndex: null })
  const listRef = useRef(null)

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

  function getTargetIndex(clientY) {
    if (!listRef.current) return dragRef.current.fromIndex
    const items = listRef.current.querySelectorAll('li[data-drag-index]')
    let closest = { index: dragRef.current.fromIndex, dist: Infinity }
    for (const item of items) {
      const rect = item.getBoundingClientRect()
      const dist = Math.abs(clientY - (rect.top + rect.height / 2))
      if (dist < closest.dist) closest = { index: parseInt(item.dataset.dragIndex), dist }
    }
    return closest.index
  }

  function handleDragHandlePointerDown(e, index) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, fromIndex: index, toIndex: index }
    setDraggingIndex(index)
    setDragTarget(index)
  }

  function handlePointerMove(e) {
    if (!dragRef.current.active) return
    const target = getTargetIndex(e.clientY)
    if (target !== dragRef.current.toIndex) {
      dragRef.current.toIndex = target
      setDragTarget(target)
    }
  }

  function handlePointerUp() {
    if (!dragRef.current.active) return
    const { fromIndex, toIndex } = dragRef.current
    dragRef.current = { active: false, fromIndex: null, toIndex: null }
    setDraggingIndex(null)
    setDragTarget(null)
    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      reorderTrack(playlistId, fromIndex, toIndex)
    }
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
          <div className="playlist-play-buttons">
            <button className="play-all-btn" onClick={() => playQueue(playlist.tracks, 0)}>
              ▶ Play All
            </button>
            <button className="shuffle-btn" onClick={() => playQueue(shuffleArray(playlist.tracks), 0)}>
              🔀 Shuffle
            </button>
          </div>
          <ul className="playlist-track-list" ref={listRef}>
            {playlist.tracks.map((track, i) => (
              <li
                key={track.id}
                data-drag-index={i}
                className={`playlist-track-item${draggingIndex === i ? ' dragging' : ''}${dragTarget === i && draggingIndex !== i ? ' drag-over' : ''}`}
              >
                <span
                  className="drag-handle"
                  onPointerDown={e => handleDragHandlePointerDown(e, i)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  aria-label="Drag to reorder"
                >⠿</span>
                <TrackItem
                  track={track}
                  queue={playlist.tracks}
                  queueIndex={i}
                  showRemove
                  onRemove={() => removeTrack(playlistId, track.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
