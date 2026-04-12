import { useState, useEffect, useRef } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import './AddToPlaylistBtn.css'

export default function AddToPlaylistBtn({ track, size = 'normal' }) {
  const { playlists, addTrack, isTrackSaved, removeTrackFromAll } = usePlaylists()
  const [showMenu, setShowMenu] = useState(false)
  const [opensDown, setOpensDown] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)
  const saved = isTrackSaved(track.id)

  useEffect(() => {
    if (!showMenu) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [showMenu])

  function handleClick(e) {
    e.stopPropagation()
    if (saved) {
      removeTrackFromAll(track.id)
      setShowMenu(false)
    } else {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        // If less than 200px above the button, open downward instead
        setOpensDown(rect.top < 200)
      }
      setShowMenu(v => !v)
    }
  }

  function handleAdd(playlistId, e) {
    e.stopPropagation()
    addTrack(playlistId, track)
    setShowMenu(false)
  }

  return (
    <div className={`atpb-wrap ${size === 'large' ? 'atpb-large' : ''}`} ref={menuRef}>
      <button
        ref={btnRef}
        className={`atpb-btn ${saved ? 'atpb-saved' : ''}`}
        onClick={handleClick}
        aria-label={saved ? 'Remove from playlist' : 'Add to playlist'}
      >
        {saved ? '✓' : '+'}
      </button>

      {showMenu && (
        <div className={`atpb-menu ${opensDown ? 'atpb-menu-down' : ''}`}>
          {playlists.length === 0
            ? <span className="atpb-empty">No playlists yet</span>
            : playlists.map(pl => (
                <button key={pl.id} className="atpb-menu-item" onClick={(e) => handleAdd(pl.id, e)}>
                  {pl.name}
                </button>
              ))
          }
        </div>
      )}
    </div>
  )
}
