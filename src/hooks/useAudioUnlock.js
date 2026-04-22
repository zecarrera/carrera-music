import { useEffect } from 'react'

// Minimal 46-byte silent WAV (1 sample, 44100Hz, 16-bit mono)
const SILENT_WAV = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA=='

/**
 * Plays a silent sample via an HTMLMediaElement (not AudioContext) to activate
 * iOS AVAudioSession on the first user interaction. HTMLMediaElement activation
 * uses a different OS audio path than AudioContext, allowing cross-origin iframes
 * with allow="autoplay" to participate in the same session.
 *
 * Called once on the first touch or click anywhere in the app.
 * For gesture-specific unlocking (track tap, next, prev), see unlockAudio() in
 * PlayerContext.jsx which fires on every relevant gesture.
 */
export function useAudioUnlock() {
  useEffect(() => {
    let unlocked = false

    function unlock() {
      if (unlocked) return
      unlocked = true
      unlockAudio()
      document.removeEventListener('touchstart', unlock, true)
      document.removeEventListener('click', unlock, true)
    }

    document.addEventListener('touchstart', unlock, { capture: true, passive: true })
    document.addEventListener('click', unlock, { capture: true, passive: true })

    return () => {
      document.removeEventListener('touchstart', unlock, true)
      document.removeEventListener('click', unlock, true)
    }
  }, [])
}

/**
 * Plays a silent HTMLMediaElement sample to activate/refresh iOS AVAudioSession.
 * Call this synchronously inside user gesture handlers before any deferred work.
 */
export function unlockAudio() {
  try {
    const audio = new Audio(SILENT_WAV)
    audio.play().catch(() => {})
  } catch {
    // Best-effort — silently ignore if Audio is unavailable
  }
}
