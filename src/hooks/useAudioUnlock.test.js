import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAudioUnlock } from './useAudioUnlock.js'

describe('useAudioUnlock', () => {
  let addSpy, removeSpy

  beforeEach(() => {
    addSpy = vi.spyOn(document, 'addEventListener')
    removeSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('calls AudioContext and plays a silent buffer on first click', () => {
    const mockStart = vi.fn()
    const mockConnect = vi.fn()
    const mockResume = vi.fn().mockResolvedValue(undefined)
    const mockCreateBufferSource = vi.fn(() => ({ buffer: null, connect: mockConnect, start: mockStart }))
    const mockCreateBuffer = vi.fn(() => ({}))
    const mockCtx = {
      createBuffer: mockCreateBuffer,
      createBufferSource: mockCreateBufferSource,
      destination: {},
      resume: mockResume,
    }
    const MockAudioCtx = vi.fn(() => mockCtx)
    vi.stubGlobal('AudioContext', MockAudioCtx)

    renderHook(() => useAudioUnlock())

    document.dispatchEvent(new Event('click', { bubbles: true }))

    expect(MockAudioCtx).toHaveBeenCalledOnce()
    expect(mockStart).toHaveBeenCalledOnce()
    expect(mockResume).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('only unlocks once even if multiple interactions occur', () => {
    const MockAudioCtx = vi.fn(() => ({
      createBuffer: vi.fn(() => ({})),
      createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    }))
    vi.stubGlobal('AudioContext', MockAudioCtx)

    renderHook(() => useAudioUnlock())

    document.dispatchEvent(new Event('click', { bubbles: true }))
    document.dispatchEvent(new Event('click', { bubbles: true }))
    document.dispatchEvent(new Event('touchstart', { bubbles: true }))

    expect(MockAudioCtx).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })
})
