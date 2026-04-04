/**
 * Provider interface contract.
 * Each provider must return data in these shapes.
 *
 * Track: { id, title, artist, thumbnail, duration, providerId }
 * SearchResult: Track[]
 */

export const PROVIDERS = {
  YOUTUBE: 'youtube',
  AUDIUS: 'audius',
}
