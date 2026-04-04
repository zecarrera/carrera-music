import { useEffect, useRef, useState } from 'react'
import './player.css'

// Loaded from .env — set VITE_YOUTUBE_API_KEY in your .env file
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

// Hardcoded search queries to pre-fetch track metadata on load
const SEED_QUERIES = [
  'Rick Astley Never Gonna Give You Up official',
  'PSY Gangnam Style official',
  'Ed Sheeran Shape of You official',
]

async function searchTrack(query) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', query)
  url.searchParams.set('type', 'video')
  url.searchParams.set('videoCategoryId', '10') // Music category
  url.searchParams.set('maxResults', '1')
  url.searchParams.set('key', API_KEY)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) throw new Error('No results found')

  return {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url,
  }
}

let ytApiLoaded = false

function loadYouTubeApi() {
  if (ytApiLoaded || document.getElementById('yt-iframe-script')) return
  ytApiLoaded = true
  const tag = document.createElement('script')
  tag.id = 'yt-iframe-script'
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

export default function YouTubeDataPlayer() {
  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)
  const [apiReady, setApiReady] = useState(!!window.YT?.Player)
  const [tracks, setTracks] = useState([])
  const [trackIndex, setTrackIndex] = useState(0)
  const [playerState, setPlayerState] = useState('unstarted')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [log, setLog] = useState([])

  function addLog(msg) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20))
  }

  // Load YouTube IFrame API (needed for embed playback)
  useEffect(() => {
    loadYouTubeApi()
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      setApiReady(true)
      addLog('IFrame API ready')
    }
    if (window.YT?.Player) setApiReady(true)
    return () => { window.onYouTubeIframeAPIReady = previousCallback }
  }, [])

  // Pre-fetch seed tracks via Data API
  useEffect(() => {
    if (!API_KEY) {
      addLog('⚠ No API key — set VITE_YOUTUBE_API_KEY in .env')
      return
    }
    addLog('Fetching seed tracks via Data API…')
    Promise.all(SEED_QUERIES.map(q => searchTrack(q).catch(e => null)))
      .then(results => {
        const valid = results.filter(Boolean)
        setTracks(valid)
        addLog(`Loaded ${valid.length} tracks via Data API`)
      })
      .catch(e => {
        setFetchError(e.message)
        addLog(`Data API error: ${e.message}`)
      })
  }, [])

  // Create/recreate YT player when track changes
  useEffect(() => {
    if (!apiReady || !playerContainerRef.current || tracks.length === 0) return

    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    const videoId = tracks[trackIndex]?.id
    if (!videoId) return

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      height: '200',
      width: '100%',
      videoId,
      playerVars: {
        playsinline: 1,
        controls: 0,
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
  }, [apiReady, tracks, trackIndex])

  // Media Session registration
  useEffect(() => {
    if (!('mediaSession' in navigator) || tracks.length === 0) return

    const track = tracks[trackIndex]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track?.title ?? 'Unknown',
      artist: track?.channel ?? '',
      artwork: track?.thumbnail ? [{ src: track.thumbnail }] : [],
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
      setTrackIndex(i => (i + 1) % tracks.length)
      addLog('Media Session: next track')
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      setTrackIndex(i => (i - 1 + tracks.length) % tracks.length)
      addLog('Media Session: previous track')
    })

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  }, [tracks, trackIndex])

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim() || !API_KEY) return
    setSearching(true)
    addLog(`Searching: "${searchQuery}"`)
    try {
      const result = await searchTrack(searchQuery.trim())
      setTracks(prev => [...prev, result])
      setTrackIndex(prev => prev) // stay on current track
      addLog(`Added: ${result.title}`)
    } catch (err) {
      addLog(`Search error: ${err.message}`)
    } finally {
      setSearching(false)
      setSearchQuery('')
    }
  }

  const track = tracks[trackIndex]

  return (
    <div className="player-wrap">
      <p className="note">
        <strong>Data API approach.</strong> Uses YouTube Data API for search/metadata,
        IFrame embed for playback. Thumbnail + channel name sourced from API response.
      </p>

      {!API_KEY && (
        <p className="note warn">
          ⚠ <strong>VITE_YOUTUBE_API_KEY</strong> not set. Add it to a <code>.env</code> file
          to enable Data API features. Playback embed will still load.
        </p>
      )}

      {track && (
        <div className="track-info rich">
          {track.thumbnail && (
            <img className="thumb" src={track.thumbnail} alt={track.title} />
          )}
          <div>
            <span className="track-index">{trackIndex + 1} / {tracks.length}</span>
            <span className="track-title">{track.title}</span>
            <span className="track-channel">{track.channel}</span>
          </div>
        </div>
      )}

      {tracks.length === 0 && !fetchError && (
        <p className="loading">Loading tracks via Data API…</p>
      )}

      {fetchError && (
        <p className="note warn">Data API error: {fetchError}</p>
      )}

      <div className="yt-container" ref={playerContainerRef} />

      {tracks.length > 0 && (
        <>
          <div className="state-badge" data-state={playerState}>{playerState}</div>

          <div className="controls">
            <button onClick={() => { setTrackIndex(i => (i - 1 + tracks.length) % tracks.length); addLog('⏮ prev') }}>⏮</button>
            <button onClick={() => { playerRef.current?.playVideo(); addLog('▶ play (user gesture)') }} disabled={playerState === 'playing'}>▶ Play</button>
            <button onClick={() => { playerRef.current?.pauseVideo(); addLog('⏸ pause') }} disabled={playerState !== 'playing'}>⏸ Pause</button>
            <button onClick={() => { setTrackIndex(i => (i + 1) % tracks.length); addLog('⏭ next') }}>⏭</button>
            <button onClick={() => { playerRef.current?.seekTo(30, true); addLog('⏩ seeked to 0:30') }}>⏩ +30s</button>
          </div>
        </>
      )}

      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search YouTube…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          disabled={!API_KEY || searching}
        />
        <button type="submit" disabled={!API_KEY || searching || !searchQuery.trim()}>
          {searching ? '…' : 'Search'}
        </button>
      </form>

      <div className="log-panel">
        <h3>Event log</h3>
        {log.length === 0 && <p className="log-empty">No events yet.</p>}
        {log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)}
      </div>
    </div>
  )
}
