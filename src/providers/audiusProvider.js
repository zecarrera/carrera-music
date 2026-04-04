import { PROVIDERS } from './types.js'

// Audius uses a decentralized network — we fetch a live host first
const AUDIUS_HOST_URL = 'https://api.audius.co'
const APP_NAME = 'carrera-music'

let hostCache = null

async function getHost() {
  if (hostCache) return hostCache
  try {
    const res = await fetch(AUDIUS_HOST_URL)
    const data = await res.json()
    // Pick first available host
    hostCache = data.data?.[0] ?? 'https://discoveryprovider.audius.co'
  } catch {
    hostCache = 'https://discoveryprovider.audius.co'
  }
  return hostCache
}

async function search(query) {
  const host = await getHost()
  const url = new URL(`${host}/v1/tracks/search`)
  url.searchParams.set('query', query)
  url.searchParams.set('limit', '10')
  url.searchParams.set('app_name', APP_NAME)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Audius search error: ${res.status}`)
  const data = await res.json()

  return (data.data ?? []).map(track => ({
    id: track.id,
    title: track.title,
    artist: track.user?.name ?? track.user?.handle ?? 'Unknown',
    thumbnail: track.artwork?.['480x480'] ?? track.artwork?.['150x150'] ?? null,
    duration: track.duration ?? 0,
    providerId: PROVIDERS.AUDIUS,
    // Store host so we can build the stream URL later
    _host: host,
  }))
}

export function getStreamUrl(track) {
  const host = track._host ?? 'https://discoveryprovider.audius.co'
  return `${host}/v1/tracks/${track.id}/stream?app_name=${APP_NAME}`
}

export const audiusProvider = { search, getStreamUrl }
