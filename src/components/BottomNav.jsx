import { usePlayer } from '../context/PlayerContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './BottomNav.css'

export default function BottomNav({ activeView, onNavigate, onOpenAccount }) {
  const { currentTrack, isPlaying } = usePlayer()
  const { isAnonymous } = useAuth()

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
        <span className="nav-label">Playlists</span>
      </button>

      <button
        className={`nav-btn nav-btn-account ${!isAnonymous ? 'nav-btn-signed-in' : ''}`}
        onClick={onOpenAccount}
        aria-label={isAnonymous ? 'Sign in' : 'Account'}
      >
        <span className="nav-icon">
          {isAnonymous ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          )}
        </span>
        <span className="nav-label">{isAnonymous ? 'Sign in' : 'Account'}</span>
      </button>
    </nav>
  )
}
