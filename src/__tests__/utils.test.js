import { describe, it, expect, beforeEach } from 'vitest'

// ── formatDuration (from TrackItem) ──────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

describe('formatDuration', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(null)).toBe('')
    expect(formatDuration(undefined)).toBe('')
  })
  it('formats seconds under a minute', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(59)).toBe('0:59')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(3661)).toBe('61:01')
  })
  it('pads single-digit seconds', () => {
    expect(formatDuration(61)).toBe('1:01')
  })
})

// ── fmt (from PlayerBar / PlayerView) ────────────────────────────────────────
function fmt(s) {
  if (!s || isNaN(s) || s === Infinity) return '0:00'
  const m = Math.floor(s / 60), sec = String(Math.floor(s % 60)).padStart(2, '0')
  return `${m}:${sec}`
}

describe('fmt', () => {
  it('returns 0:00 for falsy / invalid values', () => {
    expect(fmt(0)).toBe('0:00')
    expect(fmt(null)).toBe('0:00')
    expect(fmt(NaN)).toBe('0:00')
    expect(fmt(Infinity)).toBe('0:00')
  })
  it('formats correctly', () => {
    expect(fmt(65)).toBe('1:05')
    expect(fmt(3600)).toBe('60:00')
  })
})

// ── loadRecent / saveRecent (from SearchView) ─────────────────────────────────
const RECENT_KEY = 'cm_recent_searches'

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(searches) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(searches.slice(0, 6))) } catch { /* ignore */ }
}

describe('loadRecent', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty array when nothing stored', () => {
    expect(loadRecent()).toEqual([])
  })
  it('returns stored searches', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['foo', 'bar']))
    expect(loadRecent()).toEqual(['foo', 'bar'])
  })
  it('returns empty array on invalid JSON', () => {
    localStorage.setItem(RECENT_KEY, 'not-json{')
    expect(loadRecent()).toEqual([])
  })
})

describe('saveRecent', () => {
  beforeEach(() => localStorage.clear())

  it('saves searches to localStorage', () => {
    saveRecent(['foo', 'bar'])
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))).toEqual(['foo', 'bar'])
  })
  it('caps at 6 entries', () => {
    saveRecent(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))).toHaveLength(6)
  })
})
