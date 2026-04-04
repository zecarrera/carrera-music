import { useState } from 'react'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { PlaylistProvider } from './context/PlaylistContext.jsx'
import SearchView from './views/SearchView.jsx'
import LibraryView from './views/LibraryView.jsx'
import PlaylistView from './views/PlaylistView.jsx'
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
      <div className="view-area">
        {activeView === 'search' && <SearchView />}
        {activeView === 'library' && <LibraryView onOpenPlaylist={handleOpenPlaylist} />}
        {activeView === 'playlist' && openPlaylistId && (
          <PlaylistView playlistId={openPlaylistId} onBack={handleBackFromPlaylist} />
        )}
      </div>

      <PlayerBar />
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
