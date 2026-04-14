import { useEffect, useState, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import AddToPlaylistBtn from '../components/AddToPlaylistBtn.jsx'
import PlaylistSearchSheet from '../components/PlaylistSearchSheet.jsx'
import './PlayerView.css'

function fmt(s) {
  if (!s || isNaN(s) || s === Infinity) return '0:00'
  const m = Math.floor(s / 60), sec = String(Math.floor(s % 60)).padStart(2, '0')
  return `${m}:${sec}`
}

const YT_BUFFERING = 3

const PrevIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
  </svg>
)

const NextIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zm8.5-6 3.5 6V6z"/>
  </svg>
)

const PlayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
)

const PauseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
)

const SpinnerIcon = () => (
  <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
)

export default function PlayerView({ onNavigate }) {
  const {
    currentTrack, isPlaying, ytState,
    play, pause, next, prev, seekTo, getCurrentTime, getDuration,
    queueIndex, queue, jumpTo,
  } = usePlayer()

  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showPlaylistSearch, setShowPlaylistSearch] = useState(false)
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
        <button className="pv-empty-cta pv-empty-cta--secondary" onClick={() => setShowPlaylistSearch(true)}>
          Browse playlists
        </button>
        {showPlaylistSearch && <PlaylistSearchSheet onClose={() => setShowPlaylistSearch(false)} />}
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
        <div className="pv-meta-row">
          <div className="pv-meta-text">
            <h2 className="pv-title">{currentTrack.title}</h2>
            <p className="pv-artist">{currentTrack.artist}</p>
          </div>
          <AddToPlaylistBtn track={currentTrack} size="large" />
        </div>
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
        <button className="pv-btn" onClick={prev} disabled={!hasPrev} aria-label="Previous"><PrevIcon /></button>
        <button className="pv-btn pv-btn-play" onClick={isPlaying ? pause : play} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isBuffering ? <SpinnerIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="pv-btn" onClick={next} disabled={!hasNext} aria-label="Next"><NextIcon /></button>
      </div>

      {queue.length > 1 && (
        <div className="pv-up-next">
          <p className="pv-queue-pos">{queueIndex + 1} of {queue.length} in queue</p>
          {queueIndex < queue.length - 1 && (
            <div className="pv-queue-list">
              {queue.slice(queueIndex + 1).map((track, i) => {
                const trackIndex = queueIndex + 1 + i
                return (
                  <button
                    key={track.id}
                    className="pv-queue-item"
                    onClick={() => jumpTo(trackIndex)}
                    aria-label={`Play ${track.title}`}
                  >
                    <span className="pv-queue-num">{trackIndex + 1}</span>
                    <div className="pv-queue-info">
                      <span className="pv-queue-title">{track.title}</span>
                      {track.artist && <span className="pv-queue-artist">{track.artist}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="pv-browse-playlists">
        <button className="pv-browse-playlists-btn" onClick={() => setShowPlaylistSearch(true)}>
          🎵 Search YouTube playlist
        </button>
      </div>

      {showPlaylistSearch && <PlaylistSearchSheet onClose={() => setShowPlaylistSearch(false)} />}
    </div>
  )
}
