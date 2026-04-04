import { useEffect, useState, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import './PlayerBar.css'

export default function PlayerBar() {
  const { currentTrack, isPlaying, play, pause, next, prev, seekTo, getCurrentTime, getDuration, queueIndex, queue } = usePlayer()
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const duration = getDuration()
        if (duration > 0) setProgress(getCurrentTime() / duration)
      }, 500)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, getCurrentTime, getDuration])

  if (!currentTrack) return null

  const hasPrev = queueIndex > 0
  const hasNext = queueIndex < queue.length - 1

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekTo(ratio * getDuration())
    setProgress(ratio)
  }

  return (
    <div className="player-bar">
      <div className="progress-track" onClick={handleSeek} role="slider" aria-label="Seek">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="player-bar-inner">
        <div className="player-track-info">
          {currentTrack.thumbnail && (
            <img className="player-thumb" src={currentTrack.thumbnail} alt={currentTrack.title} />
          )}
          <div className="player-text">
            <span className="player-title">{currentTrack.title}</span>
            <span className="player-artist">{currentTrack.artist}</span>
          </div>
        </div>

        <div className="player-controls">
          <button onClick={prev} disabled={!hasPrev} aria-label="Previous">⏮</button>
          <button
            className="play-pause-btn"
            onClick={isPlaying ? pause : play}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={next} disabled={!hasNext} aria-label="Next">⏭</button>
        </div>
      </div>
    </div>
  )
}
