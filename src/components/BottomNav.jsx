import './BottomNav.css'

export default function BottomNav({ activeView, onNavigate }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-btn ${activeView === 'search' ? 'active' : ''}`}
        onClick={() => onNavigate('search')}
      >
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Search</span>
      </button>
      <button
        className={`nav-btn ${activeView === 'library' ? 'active' : ''}`}
        onClick={() => onNavigate('library')}
      >
        <span className="nav-icon">📚</span>
        <span className="nav-label">Library</span>
      </button>
    </nav>
  )
}
