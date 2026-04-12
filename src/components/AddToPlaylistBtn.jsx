import { useState, useEffect, useRef } from 'react'
import { usePlaylists } from '../context/PlaylistContext.jsx'
import './AddToPlaylistBtn.css'

export default function AddToPlaylistBtn({ track, size = 'normal' }) {
  const { playlists, addTrack, removeTrack, isTrackSaved } = usePlaylists()
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
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setOpensDown(rect.top < 200)
    }
    setShowMenu(v => !v)
  }

  function handleToggle(pl, e) {
    e.stopPropagation()
    const inPlaylist = pl.tracks.some(t => t.id === track.id)
    if (inPlaylist) {
      removeTrack(pl.id, track.id)
    } else {
      addTrack(pl.id, track)
    }
    // Keep menu open so user can add to multiple playlists at once
  }

  return (
    <div className={`atpb-wrap ${size === 'large' ? 'atpb-large' : ''}`} ref={menuRef}>
      <button
        ref={btnRef}
        className={`atpb-btn ${saved ? 'atpb-saved' : ''}`}
        onClick={handleClick}
        aria-label={saved ? 'Manage playlists' : 'Add to playlist'}
      >
        {saved ? '✓' : '+'}
      </button>

      {showMenu && (
        <div className={`atpb-menu ${opensDown ? 'atpb-menu-down' : ''}`}>
          {playlists.length === 0
            ? <span className="atpb-empty">No playlists yet</span>
            : playlists.map(pl => {
                const inPlaylist = pl.tracks.some(t => t.id === track.id)
                return (
                  <button
                    key={pl.id}
                    className={`atpb-menu-item ${inPlaylist ? 'atpb-in-playlist' : ''}`}
                    onClick={(e) => handleToggle(pl, e)}
                  >
                    <span className="atpb-check">{inPlaylist ? '✓' : ''}</span>
                    {pl.name}
                  </button>
                )
              })
          }
        </div>
      )}
    </div>
  )
}
