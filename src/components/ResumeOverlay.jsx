import { usePlayer } from '../context/PlayerContext.jsx'
import './ResumeOverlay.css'

export default function ResumeOverlay() {
  const { needsResume, currentTrack, handleResume, dismissResume } = usePlayer()

  if (!needsResume || !currentTrack) return null

  return (
    <div className="resume-overlay" onClick={handleResume} role="button" aria-label="Resume playback">
      <div className="resume-card">
        {currentTrack.thumbnail && (
          <img className="resume-thumb" src={currentTrack.thumbnail} alt={currentTrack.title} />
        )}
        <p className="resume-label">Playback paused</p>
        <p className="resume-track">{currentTrack.title}</p>
        <button className="resume-btn" onClick={handleResume}>▶ Tap to Resume</button>
        <button className="resume-dismiss" onClick={(e) => { e.stopPropagation(); dismissResume() }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
