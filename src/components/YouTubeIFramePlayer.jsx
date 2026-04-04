import { useEffect, useRef, useState } from 'react'
import './player.css'

// Hardcoded test tracks (replace with your own YouTube video IDs)
const TEST_TRACKS = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley – Never Gonna Give You Up' },
  { id: '9bZkp7q19f0', title: 'PSY – Gangnam Style' },
  { id: 'JGwWNGJdvx8', title: 'Ed Sheeran – Shape of You' },
]

let ytApiLoaded = false

function loadYouTubeApi() {
  if (ytApiLoaded || document.getElementById('yt-iframe-script')) return
  ytApiLoaded = true
  const tag = document.createElement('script')
  tag.id = 'yt-iframe-script'
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

export default function YouTubeIFramePlayer() {
  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)
  const [apiReady, setApiReady] = useState(!!window.YT?.Player)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playerState, setPlayerState] = useState('unstarted') // unstarted | playing | paused | ended
  const [log, setLog] = useState([])

  function addLog(msg) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20))
  }

  useEffect(() => {
    loadYouTubeApi()

    const previousCallback = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      setApiReady(true)
      addLog('IFrame API ready')
    }

    if (window.YT?.Player) {
      setApiReady(true)
    }

    return () => {
      window.onYouTubeIframeAPIReady = previousCallback
    }
  }, [])

  useEffect(() => {
    if (!apiReady || !playerContainerRef.current) return

    // Destroy existing player before creating a new one
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      height: '200',
      width: '100%',
      videoId: TEST_TRACKS[trackIndex].id,
      playerVars: {
        playsinline: 1, // Required for inline playback on iOS (prevents fullscreen takeover)
        controls: 0,    // Hide native controls — we provide our own
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => addLog('Player ready'),
        onStateChange: (e) => {
          const stateMap = {
            [-1]: 'unstarted',
            [window.YT.PlayerState.PLAYING]: 'playing',
            [window.YT.PlayerState.PAUSED]: 'paused',
            [window.YT.PlayerState.ENDED]: 'ended',
            [window.YT.PlayerState.BUFFERING]: 'buffering',
          }
          const label = stateMap[e.data] ?? `state:${e.data}`
          setPlayerState(label)
          addLog(`State → ${label}`)
        },
        onError: (e) => addLog(`Error code: ${e.data}`),
      },
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [apiReady, trackIndex])

  // Register Media Session for lock-screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const track = TEST_TRACKS[trackIndex]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Spike Test',
    })

    navigator.mediaSession.setActionHandler('play', () => {
      playerRef.current?.playVideo()
      addLog('Media Session: play')
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      playerRef.current?.pauseVideo()
      addLog('Media Session: pause')
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      setTrackIndex(i => (i + 1) % TEST_TRACKS.length)
      addLog('Media Session: next track')
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      setTrackIndex(i => (i - 1 + TEST_TRACKS.length) % TEST_TRACKS.length)
      addLog('Media Session: previous track')
    })

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  }, [trackIndex])

  function handlePlay() {
    playerRef.current?.playVideo()
    addLog('▶ play tapped (user gesture)')
  }

  function handlePause() {
    playerRef.current?.pauseVideo()
    addLog('⏸ pause tapped')
  }

  function handlePrev() {
    setTrackIndex(i => (i - 1 + TEST_TRACKS.length) % TEST_TRACKS.length)
    addLog('⏮ prev tapped')
  }

  function handleNext() {
    setTrackIndex(i => (i + 1) % TEST_TRACKS.length)
    addLog('⏭ next tapped')
  }

  function handleSeek() {
    playerRef.current?.seekTo(30, true)
    addLog('⏩ seeked to 0:30')
  }

  const track = TEST_TRACKS[trackIndex]

  return (
    <div className="player-wrap">
      <p className="note">
        <strong>IFrame API approach.</strong> Playback must be triggered by a direct tap.
        Tests: play, pause, seek, prev/next. Check the log for iOS behavior.
      </p>

      <div className="track-info">
        <span className="track-index">{trackIndex + 1} / {TEST_TRACKS.length}</span>
        <span className="track-title">{track.title}</span>
      </div>

      <div className="yt-container" ref={playerContainerRef} />

      <div className="state-badge" data-state={playerState}>{playerState}</div>

      <div className="controls">
        <button onClick={handlePrev}>⏮</button>
        <button onClick={handlePlay} disabled={playerState === 'playing'}>▶ Play</button>
        <button onClick={handlePause} disabled={playerState !== 'playing'}>⏸ Pause</button>
        <button onClick={handleNext}>⏭</button>
        <button onClick={handleSeek}>⏩ +30s</button>
      </div>

      {!apiReady && <p className="loading">Loading YouTube API…</p>}

      <div className="log-panel">
        <h3>Event log</h3>
        {log.length === 0 && <p className="log-empty">No events yet.</p>}
        {log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)}
      </div>
    </div>
  )
}
