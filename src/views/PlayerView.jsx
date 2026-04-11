import { useEffect, useState, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import './PlayerView.css'

function fmt(s) {
  if (!s || isNaN(s) || s === Infinity) return '0:00'
  const m = Math.floor(s / 60), sec = String(Math.floor(s % 60)).padStart(2, '0')
  return `${m}:${sec}`
}

const YT_BUFFERING = 3

export default function PlayerView({ onNavigate }) {
  const {
    currentTrack, isPlaying, ytState,
    play, pause, next, prev, seekTo, getCurrentTime, getDuration,
    queueIndex, queue,
  } = usePlayer()

  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const d = getDuration(), t = getCurrentTime()
        setDuration(d); setCurrentTime(t)
        if (d > 0) setProgress(t / d)
      }, 500)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, getCurrentTime, getDuration])

  if (!currentTrack) {
    return (
      <div className="player-view player-view-empty">
        <div className="pv-empty-art">♫</div>
        <p className="pv-empty-title">Nothing playing yet</p>
        <p className="pv-empty-sub">Find something to listen to</p>
        <button className="pv-empty-cta" onClick={() => onNavigate('search')}>
          Search for music
        </button>
      </div>
    )
  }

  const isBuffering = ytState === YT_BUFFERING
  const hasPrev = queueIndex > 0
  const hasNext = queueIndex < queue.length - 1
  const thumb = currentTrack.thumbnailMedium ?? currentTrack.thumbnail

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(ratio * getDuration())
    setProgress(ratio)
  }

  return (
    <div className="player-view">
      <div className="pv-art-wrap">
        {thumb
          ? <img className="pv-art" src={thumb} alt={currentTrack.title} />
          : <div className="pv-art-placeholder">♫</div>
        }
      </div>

      <div className="pv-meta">
        <h2 className="pv-title">{currentTrack.title}</h2>
        <p className="pv-artist">{currentTrack.artist}</p>
      </div>

      <div className="pv-progress-wrap">
        <div className="pv-track" onClick={handleSeek} role="slider" aria-label="Seek">
          <div className="pv-fill" style={{ width: `${progress * 100}%` }} />
          <div className="pv-knob" style={{ left: `calc(${progress * 100}% - 6px)` }} />
        </div>
        <div className="pv-times">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <div className="pv-controls">
        <button className="pv-btn" onClick={prev} disabled={!hasPrev} aria-label="Previous">⏮</button>
        <button className="pv-btn pv-btn-play" onClick={isPlaying ? pause : play} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isBuffering ? <span className="spin">⟳</span> : isPlaying ? '⏸' : '▶'}
        </button>
        <button className="pv-btn" onClick={next} disabled={!hasNext} aria-label="Next">⏭</button>
      </div>

      {queue.length > 1 && (
        <p className="pv-queue">{queueIndex + 1} of {queue.length} in queue</p>
      )}
    </div>
  )
}
