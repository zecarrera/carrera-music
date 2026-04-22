import { useEffect } from 'react'

/**
 * On the first user interaction (touch or click), plays a silent 1-frame audio
 * buffer via Web Audio API. This primes the iOS audio session so that
 * subsequent programmatic audio — including YouTube iframe playback — is less
 * likely to be blocked by the OS-level media activation requirement.
 *
 * Must be called in a component that is mounted for the lifetime of the app
 * (e.g. App) so the listener is present before the user's very first tap.
 */
export function useAudioUnlock() {
  useEffect(() => {
    let unlocked = false

    function unlock() {
      if (unlocked) return
      unlocked = true

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return
        const ctx = new AudioCtx()
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start(0)
        ctx.resume().catch(() => {})
      } catch {
        // Silently ignore — audio unlock is best-effort
      }

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
