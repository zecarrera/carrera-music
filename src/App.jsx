import { useState } from 'react'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { PlaylistProvider } from './context/PlaylistContext.jsx'
import SearchView from './views/SearchView.jsx'
import LibraryView from './views/LibraryView.jsx'
import PlaylistView from './views/PlaylistView.jsx'
import PlayerView from './views/PlayerView.jsx'
import PlayerBar from './components/PlayerBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import ResumeOverlay from './components/ResumeOverlay.jsx'
import './App.css'

function AppShell() {
  const [activeView, setActiveView] = useState('search')
  const [openPlaylistId, setOpenPlaylistId] = useState(null)

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
      <BottomNav activeView={activeView === 'playlist' ? 'library' : activeView} onNavigate={handleNavigate} />
      <ResumeOverlay />
    </div>
  )
}

export default function App() {
  return (
    <PlaylistProvider>
      <PlayerProvider>
        <AppShell />
      </PlayerProvider>
    </PlaylistProvider>
  )
}
