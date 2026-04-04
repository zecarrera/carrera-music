import { PROVIDERS } from './types.js'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

function durationToSeconds(iso) {
  const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0)
}

async function search(query) {
  if (!API_KEY) throw new Error('VITE_YOUTUBE_API_KEY is not set')

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '10')
  searchUrl.searchParams.set('key', API_KEY)

  const res = await fetch(searchUrl)
  if (!res.ok) throw new Error(`YouTube search error: ${res.status}`)
  const data = await res.json()

  const videoIds = data.items.map(i => i.id.videoId).join(',')

  // Fetch durations in a second call
  const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  detailUrl.searchParams.set('part', 'contentDetails')
  detailUrl.searchParams.set('id', videoIds)
  detailUrl.searchParams.set('key', API_KEY)

  const detailRes = await fetch(detailUrl)
  const detailData = detailRes.ok ? await detailRes.json() : { items: [] }
  const durationMap = Object.fromEntries(
    detailData.items.map(i => [i.id, durationToSeconds(i.contentDetails.duration)])
  )

  return data.items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
    duration: durationMap[item.id.videoId] ?? 0,
    providerId: PROVIDERS.YOUTUBE,
  }))
}

export const youtubeProvider = { search }
