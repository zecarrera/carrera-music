import { useEffect, useRef, useCallback } from 'react'

let apiLoading = false

function loadYouTubeApi() {
  if (document.getElementById('yt-api-script') || window.YT?.Player) return
  if (apiLoading) return
  apiLoading = true
  const tag = document.createElement('script')
  tag.id = 'yt-api-script'
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

/**
 * Manages a single persistent YT.Player instance mounted on `containerId`.
 * Exposes: loadTrack, play, pause, seekTo, getCurrentTime, getDuration.
 * Calls onStateChange(ytState) and onReady() callbacks.
 */
export function useYouTubePlayer({ containerId, onStateChange, onReady }) {
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const pendingVideoRef = useRef(null)

  useEffect(() => {
    loadYouTubeApi()

    function initPlayer() {
      if (playerRef.current) return
      playerRef.current = new window.YT.Player(containerId, {
        height: '0',
        width: '0',
        playerVars: {
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            readyRef.current = true
            if (pendingVideoRef.current) {
              playerRef.current.loadVideoById(pendingVideoRef.current)
              pendingVideoRef.current = null
            }
            onReady?.()
          },
          onStateChange: (e) => onStateChange?.(e.data),
          onError: (e) => console.warn('[YT Player] error:', e.data),
        },
      })
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        initPlayer()
      }
    }

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
      readyRef.current = false
    }
  }, [containerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrack = useCallback((videoId) => {
    if (readyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(videoId)
    } else {
      pendingVideoRef.current = videoId
    }
  }, [])

  const play = useCallback(() => playerRef.current?.playVideo(), [])
  const pause = useCallback(() => playerRef.current?.pauseVideo(), [])
  const seekTo = useCallback((seconds) => playerRef.current?.seekTo(seconds, true), [])
  const getCurrentTime = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, [])
  const getDuration = useCallback(() => playerRef.current?.getDuration() ?? 0, [])

  return { loadTrack, play, pause, seekTo, getCurrentTime, getDuration }
}
