import { useState } from 'react'
import { useAudioUnlock } from './hooks/useAudioUnlock.js'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { PlaylistProvider } from './context/PlaylistContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import SearchView from './views/SearchView.jsx'
import LibraryView from './views/LibraryView.jsx'
import PlaylistView from './views/PlaylistView.jsx'
import PlayerView from './views/PlayerView.jsx'
import PlayerBar from './components/PlayerBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import AuthModal from './components/AuthModal.jsx'
import AccountSheet from './components/AccountSheet.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import './App.css'

function AppShell() {
  const { loading, isAnonymous } = useAuth()
  const [activeView, setActiveView] = useState('search')
  const [openPlaylistId, setOpenPlaylistId] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  if (loading) return <SplashScreen />

  function handleNavigate(view) {
    setActiveView(view)
    setOpenPlaylistId(null)
  }

  function handleOpenPlaylist(id) {
    setOpenPlaylistId(id)
    setActiveView('playlist')
  }

  function handleBackFromPlaylist() {
    setOpenPlaylistId(null)
    setActiveView('library')
  }

  function handleOpenAccount() {
    if (isAnonymous) {
      setShowAuth(true)
    } else {
      setShowAccount(true)
    }
  }

  return (
    <div className="app-shell">
      <div className="view-area">
        {/* Always-mounted views — hidden with CSS to preserve state */}
        <div className={activeView === 'search' ? 'view-slot view-slot-active' : 'view-slot'}>
          <SearchView />
        </div>
        <div className={activeView === 'library' ? 'view-slot view-slot-active' : 'view-slot'}>
          <LibraryView onOpenPlaylist={handleOpenPlaylist} />
        </div>
        <div className={activeView === 'player' ? 'view-slot view-slot-active' : 'view-slot'}>
          <PlayerView onNavigate={handleNavigate} />
        </div>
        {/* Playlist view is transient — unmount when closed is fine */}
        {activeView === 'playlist' && openPlaylistId && (
          <PlaylistView playlistId={openPlaylistId} onBack={handleBackFromPlaylist} />
        )}
      </div>

      {activeView !== 'player' && <PlayerBar onOpenPlayer={() => handleNavigate('player')} />}
      <BottomNav
        activeView={activeView === 'playlist' ? 'library' : activeView}
        onNavigate={handleNavigate}
        onOpenAccount={handleOpenAccount}
      />

      {showAuth && <AuthModal initialTab="signup" onDismiss={() => setShowAuth(false)} />}
      {showAccount && <AccountSheet onDismiss={() => setShowAccount(false)} />}
    </div>
  )
}

export default function App() {
  useAudioUnlock()
  return (
    <AuthProvider>
      <PlaylistProvider>
        <PlayerProvider>
          {/* YT player mount — positioned off-screen but in the visible layout.
              display:none and 0×0 both prevent iOS from granting audio session
              permissions to the cross-origin iframe; a real layout presence may
              allow the allow="autoplay" attribute to take effect. */}
          <div id="yt-player-mount" style={{ position: 'fixed', width: '1px', height: '1px', bottom: 0, right: 0, opacity: 0, pointerEvents: 'none' }} />
          <AppShell />
        </PlayerProvider>
      </PlaylistProvider>
    </AuthProvider>
  )
}
