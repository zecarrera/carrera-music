import { useState } from 'react'
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
      {/* Hidden YT player mount point — must always be in DOM */}
      <div id="yt-player-mount" style={{ display: 'none' }} />

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
  return (
    <AuthProvider>
      <PlaylistProvider>
        <PlayerProvider>
          <AppShell />
        </PlayerProvider>
      </PlaylistProvider>
    </AuthProvider>
  )
}
