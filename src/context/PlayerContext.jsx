import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer.js'
import { useMediaSession } from '../hooks/useMediaSession.js'

// YT player state codes
const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 }

const initialState = {
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  ytState: YT_STATE.UNSTARTED,
  // Set to true when iOS pauses us in background/lock so we can show resume UX
  needsResume: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'PLAY_QUEUE':
      return { ...state, queue: action.queue, queueIndex: action.index ?? 0, currentTrack: action.queue[action.index ?? 0], needsResume: false }
    case 'SET_YT_STATE':
      return { ...state, ytState: action.state, needsResume: action.needsResume ?? state.needsResume }
    case 'SET_NEEDS_RESUME':
      return { ...state, needsResume: action.value }
    case 'SET_INDEX': {
      const idx = Math.max(0, Math.min(action.index, state.queue.length - 1))
      return { ...state, queueIndex: idx, currentTrack: state.queue[idx], needsResume: false }
    }
    default:
      return state
  }
}

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const wasPlayingRef = useRef(false)

  const handleStateChange = useCallback((ytState) => {
    if (ytState === YT_STATE.PLAYING) wasPlayingRef.current = true

    // Detect iOS-induced pause: was playing, now paused, and page is hidden/visible
    const iosInducedPause =
      ytState === YT_STATE.PAUSED && wasPlayingRef.current && document.visibilityState === 'visible'

    dispatch({
      type: 'SET_YT_STATE',
      state: ytState,
      needsResume: iosInducedPause ? true : undefined,
    })
  }, [])

  const { loadTrack, play, pause, seekTo, getCurrentTime, getDuration } =
    useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: handleStateChange })

  // Load new track whenever currentTrack changes
  useEffect(() => {
    if (state.currentTrack) loadTrack(state.currentTrack.id)
  }, [state.currentTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect returning from background / lock screen
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && wasPlayingRef.current && state.ytState === YT_STATE.PAUSED) {
        dispatch({ type: 'SET_NEEDS_RESUME', value: true })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [state.ytState])

  const playQueue = useCallback((queue, index = 0) => {
    wasPlayingRef.current = false
    dispatch({ type: 'PLAY_QUEUE', queue, index })
  }, [])

  const handleNext = useCallback(() => {
    const next = state.queueIndex + 1
    if (next < state.queue.length) dispatch({ type: 'SET_INDEX', index: next })
  }, [state.queueIndex, state.queue.length])

  const handlePrev = useCallback(() => {
    const prev = state.queueIndex - 1
    if (prev >= 0) dispatch({ type: 'SET_INDEX', index: prev })
  }, [state.queueIndex])

  const handleResume = useCallback(() => {
    dispatch({ type: 'SET_NEEDS_RESUME', value: false })
    play()
  }, [play])

  const dismissResume = useCallback(() => {
    dispatch({ type: 'SET_NEEDS_RESUME', value: false })
  }, [])

  const isPlaying = state.ytState === YT_STATE.PLAYING || state.ytState === YT_STATE.BUFFERING

  useMediaSession({
    track: state.currentTrack,
    isPlaying,
    onPlay: play,
    onPause: pause,
    onNext: handleNext,
    onPrev: handlePrev,
  })

  return (
    <PlayerContext.Provider value={{
      currentTrack: state.currentTrack,
      queue: state.queue,
      queueIndex: state.queueIndex,
      ytState: state.ytState,
      isPlaying,
      needsResume: state.needsResume,
      playQueue,
      play,
      pause,
      seekTo,
      getCurrentTime,
      getDuration,
      next: handleNext,
      prev: handlePrev,
      handleResume,
      dismissResume,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}
