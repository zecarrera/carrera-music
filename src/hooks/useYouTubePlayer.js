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
 * iOS autoplay: the YouTube IFrame API creates the player <iframe> dynamically.
 * iOS Safari evaluates allow="autoplay" at iframe navigation time — setting it
 * via setAttribute() in onReady is too late. We intercept document.createElement
 * immediately before calling new YT.Player() so allow is set on the iframe
 * element before its src is assigned and the browser starts navigation.
 *
 * Auto-play recovery: loadTrack() sets a `wantToPlay` flag. If the player
 * enters PAUSED (2) or VIDEO_CUED (5) state while the flag is set (iOS
 * autoplay blocked — which state it produces depends on iOS version and
 * buffering speed), playVideo() is retried immediately. The flag is cleared
 * when the player reaches PLAYING, or when pause() is called explicitly.
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

      // Intercept the iframe the YT API creates and pre-set allow="autoplay;
      // encrypted-media" before the browser starts navigation. iOS Safari
      // evaluates the allow attribute at navigation time (when src is first set
      // on an in-DOM iframe) — setting it afterwards via setAttribute has no
      // effect. JavaScript is single-threaded so nothing else runs between
      // installing this intercept and YT calling document.createElement('iframe').
      const origCreateElement = document.createElement.bind(document)
      document.createElement = (tag, ...args) => {
        const el = origCreateElement(tag, ...args)
        if (tag.toLowerCase() === 'iframe') {
          el.setAttribute('allow', 'autoplay; encrypted-media')
          document.createElement = origCreateElement // restore immediately
        }
        return el
      }

      playerRef.current = new window.YT.Player(containerId, {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 1,  // sets <video autoplay> in iframe; with allow="autoplay" on the
                        // iframe element this is the HTML-attribute path iOS Safari is
                        // more likely to honour than JS-triggered video.play() calls
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
            // iOS autoplay recovery: if video lands on PAUSED or VIDEO_CUED and
            // we intended to play (loadTrack was called), retry immediately.
            // iOS may produce either state 2 (PAUSED) or state 5 (VIDEO_CUED)
            // when autoplay is blocked — we handle both.
            if ((state === 2 /* PAUSED */ || state === 5 /* VIDEO_CUED */) && wantToPlayRef.current) {
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
      // Immediately call playVideo() while still in the user gesture chain.
      // iOS Safari expires user activation after ~1 second; loadVideoById buffers
      // the video (takes longer), so the iframe's internal autoplay attempt fires
      // after activation expires and is blocked. Queuing playVideo() synchronously
      // here — before activation expires — gives the iframe a play intent that it
      // can honour when buffering completes, without needing a fresh gesture.
      playerRef.current.playVideo()
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
