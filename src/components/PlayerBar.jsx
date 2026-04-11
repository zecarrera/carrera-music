import { useEffect, useState, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import './PlayerBar.css'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60), sec = String(Math.floor(s % 60)).padStart(2, '0')
  return `${m}:${sec}`
}

export default function PlayerBar({ onOpenPlayer }) {
  const { currentTrack, isPlaying, ytState, play, pause, next, prev, seekTo, getCurrentTime, getDuration, queueIndex, queue } = usePlayer()
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const intervalRef = useRef(null)

  const YT_BUFFERING = 3

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const d = getDuration()
        const t = getCurrentTime()
        setDuration(d)
        setCurrentTime(t)
        if (d > 0) setProgress(t / d)
      }, 500)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, getCurrentTime, getDuration])

  if (!currentTrack) return null

  const hasPrev = queueIndex > 0
  const hasNext = queueIndex < queue.length - 1
  const isBuffering = ytState === YT_BUFFERING
  const thumb = currentTrack.thumbnailMedium ?? currentTrack.thumbnail

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(ratio * getDuration())
    setProgress(ratio)
  }

  return (
    <div className="player-bar">
      <div className="progress-track" onClick={handleSeek} role="slider" aria-label="Seek">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        {isBuffering && <div className="buffering-stripe" />}
      </div>

      <div className="player-bar-inner">
        <button className="player-track-info" onClick={onOpenPlayer} aria-label="Open player">
          {thumb && <img className="player-thumb" src={thumb} alt={currentTrack.title} />}
          <div className="player-text">
            <span className="player-title">{currentTrack.title}</span>
            <span className="player-artist">{currentTrack.artist}</span>
          </div>
          <span className="player-expand-hint">⌃</span>
        </button>

        <div className="player-right">
          <div className="player-time">
            {isBuffering
              ? <span className="buffering-label">Buffering…</span>
              : <span>{fmt(currentTime)} / {fmt(duration)}</span>
            }
          </div>
          <div className="player-controls">
            <button onClick={prev} disabled={!hasPrev} aria-label="Previous">⏮</button>
            <button
              className="play-pause-btn"
              onClick={isPlaying ? pause : play}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? <span className="spin">⟳</span> : isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={next} disabled={!hasNext} aria-label="Next">⏭</button>
          </div>
          {queue.length > 1 && (
            <div className="queue-badge">{queueIndex + 1} / {queue.length}</div>
          )}
        </div>
      </div>
    </div>
  )
}
