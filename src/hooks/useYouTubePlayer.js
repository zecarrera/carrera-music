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
 *
 * iOS autoplay: the mount point element must be a pre-existing <iframe> with
 * `allow="autoplay; encrypted-media"` set before the YT IFrame API navigates
 * it. iOS Safari evaluates that attribute at navigation time — setAttribute()
 * after the fact has no effect.
 *
 * Auto-play recovery: loadTrack() sets a `wantToPlay` flag. If the player
 * enters PAUSED state while the flag is set (residual iOS block), playVideo()
 * is retried immediately. The flag is cleared when the player reaches PLAYING,
 * or when pause() is called explicitly by the user.
 */
export function useYouTubePlayer({ containerId, onStateChange, onReady }) {
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const pendingVideoRef = useRef(null)
  const wantToPlayRef = useRef(false)

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
          onReady: (event) => {
            readyRef.current = true
            if (pendingVideoRef.current) {
              event.target.loadVideoById(pendingVideoRef.current)
              pendingVideoRef.current = null
            }
            onReady?.()
          },
          onStateChange: (e) => {
            const state = e.data
            // iOS autoplay recovery: if video lands on PAUSED and we intended
            // to play (loadTrack was called), retry immediately.
            if (state === 2 /* PAUSED */ && wantToPlayRef.current) {
              playerRef.current?.playVideo()
            }
            if (state === 1 /* PLAYING */) {
              wantToPlayRef.current = false
            }
            onStateChange?.(state)
          },
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
      wantToPlayRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
      readyRef.current = false
    }
  }, [containerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrack = useCallback((videoId) => {
    wantToPlayRef.current = true
    if (readyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(videoId)
    } else {
      pendingVideoRef.current = videoId
    }
  }, [])

  const play = useCallback(() => playerRef.current?.playVideo(), [])

  const pause = useCallback(() => {
    wantToPlayRef.current = false
    playerRef.current?.pauseVideo()
  }, [])

  const seekTo = useCallback((seconds) => playerRef.current?.seekTo(seconds, true), [])
  const getCurrentTime = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, [])
  const getDuration = useCallback(() => playerRef.current?.getDuration() ?? 0, [])

  return { loadTrack, play, pause, seekTo, getCurrentTime, getDuration }
}
