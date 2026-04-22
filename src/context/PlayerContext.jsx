import { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer.js'
import { useMediaSession } from '../hooks/useMediaSession.js'
import { unlockAudio } from '../hooks/useAudioUnlock.js'

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

  // Gesture handlers call unlockAudio() synchronously (within the user gesture
  // activation window) to establish iOS AVAudioSession via HTMLMediaElement, then
  // defer loadTrack to setTimeout(0). HTMLMediaElement activation uses a different
  // OS audio path from AudioContext and may allow the YouTube iframe (with
  // allow="autoplay") to autoplay within the established session.
  const playQueue = useCallback((queue, index = 0) => {
    const idx = index ?? 0
    dispatch({ type: 'PLAY_QUEUE', queue, index: idx })
    if (queue[idx]) {
      const videoId = queue[idx].id
      unlockAudio()
      setTimeout(() => loadTrack(videoId), 0)
    }
  }, [loadTrack])

  const handleNext = useCallback(() => {
    const next = state.queueIndex + 1
    if (next < state.queue.length) {
      const videoId = state.queue[next].id
      dispatch({ type: 'SET_INDEX', index: next })
      unlockAudio()
      setTimeout(() => loadTrack(videoId), 0)
    }
  }, [state.queueIndex, state.queue, loadTrack])

  const jumpTo = useCallback((index) => {
    const idx = Math.max(0, Math.min(index, state.queue.length - 1))
    if (state.queue[idx]) {
      const videoId = state.queue[idx].id
      dispatch({ type: 'SET_INDEX', index: idx })
      unlockAudio()
      setTimeout(() => loadTrack(videoId), 0)
    }
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
      const videoId = state.queue[prev].id
      dispatch({ type: 'SET_INDEX', index: prev })
      unlockAudio()
      setTimeout(() => loadTrack(videoId), 0)
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
