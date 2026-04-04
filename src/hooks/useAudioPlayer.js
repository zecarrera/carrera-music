import { useEffect, useRef, useCallback } from 'react'

export const AUDIO_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
}

/**
 * Manages a single persistent HTMLAudioElement.
 * Exposes: loadTrack(url), play, pause, seekTo, getCurrentTime, getDuration.
 * Calls onStateChange(AUDIO_STATE) when state changes.
 */
export function useAudioPlayer({ onStateChange }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    // Required for iOS inline playback
    audio.setAttribute('playsinline', '')
    audio.setAttribute('webkit-playsinline', '')
    audioRef.current = audio

    function onPlay() { onStateChange?.(AUDIO_STATE.PLAYING) }
    function onPause() {
      // ended fires before pause on some browsers — don't override
      if (!audio.ended) onStateChange?.(AUDIO_STATE.PAUSED)
    }
    function onEnded() { onStateChange?.(AUDIO_STATE.ENDED) }
    function onWaiting() { onStateChange?.(AUDIO_STATE.LOADING) }
    function onCanPlay() {
      if (!audio.paused) onStateChange?.(AUDIO_STATE.PLAYING)
    }
    function onError() { onStateChange?.(AUDIO_STATE.ERROR) }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrack = useCallback((url) => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = url
    audio.load()
    audio.play().catch(() => {
      // Autoplay blocked — user must tap play manually
    })
  }, [])

  const play = useCallback(() => audioRef.current?.play().catch(() => {}), [])
  const pause = useCallback(() => audioRef.current?.pause(), [])
  const seekTo = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds
  }, [])
  const getCurrentTime = useCallback(() => audioRef.current?.currentTime ?? 0, [])
  const getDuration = useCallback(() => audioRef.current?.duration ?? 0, [])

  return { loadTrack, play, pause, seekTo, getCurrentTime, getDuration }
}
