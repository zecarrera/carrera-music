import { useEffect } from 'react'

/**
 * Registers Media Session metadata and action handlers.
 * Called whenever the current track changes or playback state changes.
 */
export function useMediaSession({ track, isPlaying, onPlay, onPause, onNext, onPrev }) {
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: track.thumbnail ? [{ src: track.thumbnail, sizes: '320x180', type: 'image/jpeg' }] : [],
    })

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    navigator.mediaSession.setActionHandler('play', onPlay ?? null)
    navigator.mediaSession.setActionHandler('pause', onPause ?? null)
    navigator.mediaSession.setActionHandler('nexttrack', onNext ?? null)
    navigator.mediaSession.setActionHandler('previoustrack', onPrev ?? null)

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  }, [track, isPlaying, onPlay, onPause, onNext, onPrev])
}
