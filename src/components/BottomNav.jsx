import { usePlayer } from '../context/PlayerContext.jsx'
import './BottomNav.css'

export default function BottomNav({ activeView, onNavigate }) {
  const { currentTrack, isPlaying } = usePlayer()

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-btn ${activeView === 'search' ? 'active' : ''}`}
        onClick={() => onNavigate('search')}
      >
        <span className="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <span className="nav-label">Search</span>
      </button>

      <button
        className={`nav-btn nav-btn-player ${activeView === 'player' ? 'active' : ''}`}
        onClick={() => onNavigate('player')}
      >
        <span className="nav-icon player-icon-wrap">
          {currentTrack?.thumbnail
            ? <img src={currentTrack.thumbnail} alt="Now playing" className="nav-thumb" />
            : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            )
          }
          {isPlaying && <span className="playing-dot" />}
        </span>
        <span className="nav-label">{currentTrack ? 'Now Playing' : 'Player'}</span>
      </button>

      <button
        className={`nav-btn ${activeView === 'library' ? 'active' : ''}`}
        onClick={() => onNavigate('library')}
      >
        <span className="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18"/>
            <rect x="3" y="3" width="4" height="18" rx="1" fill="currentColor" stroke="none" opacity="0.4"/>
          </svg>
        </span>
        <span className="nav-label">Library</span>
      </button>
    </nav>
  )
}
