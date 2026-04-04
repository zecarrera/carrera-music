import { useState } from 'react'
import YouTubeIFramePlayer from './components/YouTubeIFramePlayer'
import YouTubeDataPlayer from './components/YouTubeDataPlayer'
import './App.css'

const TABS = [
  { id: 'iframe', label: 'IFrame API' },
  { id: 'data-api', label: 'Data API' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('iframe')

  return (
    <div className="app">
      <header className="app-header">
        <h1>Music Spike</h1>
        <nav className="tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="tab-content">
        {activeTab === 'iframe' && <YouTubeIFramePlayer />}
        {activeTab === 'data-api' && <YouTubeDataPlayer />}
      </main>
    </div>
  )
}
