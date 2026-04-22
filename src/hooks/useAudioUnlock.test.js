import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioUnlock, unlockAudio } from './useAudioUnlock.js'

describe('useAudioUnlock', () => {
  let addSpy, removeSpy

  beforeEach(() => {
    addSpy = vi.spyOn(document, 'addEventListener')
    removeSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('registers touchstart and click listeners on mount', () => {
    renderHook(() => useAudioUnlock())

    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.objectContaining({ capture: true }))
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.objectContaining({ capture: true }))
  })

  it('removes listeners on unmount', () => {
    const { unmount } = renderHook(() => useAudioUnlock())
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), true)
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), true)
  })

  it('plays a silent Audio element on first click', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const MockAudio = vi.fn(() => ({ play: mockPlay }))
    vi.stubGlobal('Audio', MockAudio)

    renderHook(() => useAudioUnlock())
    act(() => { document.dispatchEvent(new Event('click', { bubbles: true })) })

    expect(MockAudio).toHaveBeenCalledOnce()
    expect(mockPlay).toHaveBeenCalledOnce()
  })

  it('only unlocks once even if multiple interactions occur', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const MockAudio = vi.fn(() => ({ play: mockPlay }))
    vi.stubGlobal('Audio', MockAudio)

    renderHook(() => useAudioUnlock())

    act(() => { document.dispatchEvent(new Event('click', { bubbles: true })) })
    act(() => { document.dispatchEvent(new Event('click', { bubbles: true })) })
    act(() => { document.dispatchEvent(new Event('touchstart', { bubbles: true })) })

    expect(MockAudio).toHaveBeenCalledOnce()
  })
})

describe('unlockAudio', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('plays a silent Audio element', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Audio', vi.fn(() => ({ play: mockPlay })))

    unlockAudio()

    expect(mockPlay).toHaveBeenCalledOnce()
  })

  it('handles play() rejection silently', async () => {
    const mockPlay = vi.fn().mockRejectedValue(new Error('NotAllowed'))
    vi.stubGlobal('Audio', vi.fn(() => ({ play: mockPlay })))

    await expect(async () => unlockAudio()).not.toThrow()
  })
})
