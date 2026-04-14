import { PROVIDERS } from './types.js'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

// In-memory search cache (query|pageToken → result, max 40 entries)
const searchCache = new Map()
const CACHE_MAX = 40

function durationToSeconds(iso) {
  const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0)
}

function mapApiError(status) {
  if (status === 403) return 'YouTube API quota exceeded or API key invalid. Try again later.'
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status === 400) return 'Bad request. Check your API key configuration.'
  return `YouTube API error (${status}). Please try again.`
}

async function search(query, pageToken = null) {
  if (!API_KEY) throw new Error('YouTube API key is not configured. Add VITE_YOUTUBE_API_KEY to your .env file.')

  const cacheKey = `${query.toLowerCase().trim()}|${pageToken ?? ''}`
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '10')
  searchUrl.searchParams.set('key', API_KEY)
  if (pageToken) searchUrl.searchParams.set('pageToken', pageToken)

  let res
  try {
    res = await fetch(searchUrl)
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  if (!res.ok) throw new Error(mapApiError(res.status))
  const data = await res.json()

  const videoIds = data.items.map(i => i.id.videoId).join(',')

  const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  detailUrl.searchParams.set('part', 'contentDetails')
  detailUrl.searchParams.set('id', videoIds)
  detailUrl.searchParams.set('key', API_KEY)

  let detailData = { items: [] }
  try {
    const detailRes = await fetch(detailUrl)
    if (detailRes.ok) detailData = await detailRes.json()
  } catch { /* non-critical — duration just won't show */ }

  const durationMap = Object.fromEntries(
    detailData.items.map(i => [i.id, durationToSeconds(i.contentDetails.duration)])
  )

  const results = data.items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    // Use default (120x90) for list thumbnails — lower bandwidth
    thumbnail: item.snippet.thumbnails?.default?.url ?? null,
    // Keep medium (320x180) for player bar display
    thumbnailMedium: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    duration: durationMap[item.id.videoId] ?? 0,
    providerId: PROVIDERS.YOUTUBE,
  }))

  const result = { tracks: results, nextPageToken: data.nextPageToken ?? null }

  // Store in cache, evict oldest if over limit
  if (searchCache.size >= CACHE_MAX) {
    searchCache.delete(searchCache.keys().next().value)
  }
  searchCache.set(cacheKey, result)

  return result
}

export const youtubeProvider = { search }
