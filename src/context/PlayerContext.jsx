import { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer.js'
import { useMediaSession } from '../hooks/useMediaSession.js'

// YT player state codes
const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 }

// Repeat modes
const REPEAT_MODES = ['none', 'all', 'one']

const initialState = {
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  ytState: YT_STATE.UNSTARTED,
}

function reducer(state, action) {
  switch (action.type) {
    case 'PLAY_QUEUE':
      return { ...state, queue: action.queue, queueIndex: action.index ?? 0, currentTrack: action.queue[action.index ?? 0] }
    case 'SET_YT_STATE':
      return { ...state, ytState: action.state }
    case 'SET_INDEX': {
      const idx = Math.max(0, Math.min(action.index, state.queue.length - 1))
      return { ...state, queueIndex: idx, currentTrack: state.queue[idx] }
    }
    default:
      return state
  }
}

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [repeatMode, setRepeatModeState] = useState('none')

  const handleStateChange = useCallback((ytState) => {
    dispatch({ type: 'SET_YT_STATE', state: ytState })
  }, [])

  const { loadTrack, play, pause, seekTo, getCurrentTime, getDuration } =
    useYouTubePlayer({ containerId: 'yt-player-mount', onStateChange: handleStateChange })

  // Call loadTrack synchronously inside each user-gesture handler so iOS Safari
  // keeps the gesture chain intact (useEffect runs async, breaking iOS autoplay).
  const playQueue = useCallback((queue, index = 0) => {
    const idx = index ?? 0
    if (queue[idx]) loadTrack(queue[idx].id)
    dispatch({ type: 'PLAY_QUEUE', queue, index: idx })
  }, [loadTrack])

  const handleNext = useCallback(() => {
    const next = state.queueIndex + 1
    if (next < state.queue.length) {
      loadTrack(state.queue[next].id)
      dispatch({ type: 'SET_INDEX', index: next })
    }
  }, [state.queueIndex, state.queue, loadTrack])

  const jumpTo = useCallback((index) => {
    const idx = Math.max(0, Math.min(index, state.queue.length - 1))
    if (state.queue[idx]) loadTrack(state.queue[idx].id)
    dispatch({ type: 'SET_INDEX', index: idx })
  }, [state.queue, loadTrack])

  const toggleRepeat = useCallback(() => {
    setRepeatModeState((current) => {
      const next = REPEAT_MODES[(REPEAT_MODES.indexOf(current) + 1) % REPEAT_MODES.length]
      return next
    })
  }, [])

  // Auto-advance (or repeat) when current track ends
  useEffect(() => {
    if (state.ytState !== YT_STATE.ENDED) return

    if (repeatMode === 'one') {
      seekTo(0)
      play()
      return
    }

    const next = state.queueIndex + 1
    if (next < state.queue.length) {
      loadTrack(state.queue[next].id)
      dispatch({ type: 'SET_INDEX', index: next })
    } else if (repeatMode === 'all' && state.queue.length > 0) {
      loadTrack(state.queue[0].id)
      dispatch({ type: 'SET_INDEX', index: 0 })
    }
  }, [state.ytState]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = useCallback(() => {
    const prev = state.queueIndex - 1
    if (prev >= 0) {
      loadTrack(state.queue[prev].id)
      dispatch({ type: 'SET_INDEX', index: prev })
    }
  }, [state.queueIndex, state.queue, loadTrack])

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
      repeatMode,
      toggleRepeat,
      playQueue,
      play,
      pause,
      seekTo,
      getCurrentTime,
      getDuration,
      next: handleNext,
      prev: handlePrev,
      jumpTo,
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
