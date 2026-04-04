import { youtubeProvider } from './youtubeProvider.js'
import { audiusProvider } from './audiusProvider.js'
import { PROVIDERS } from './types.js'

const registry = {
  [PROVIDERS.YOUTUBE]: youtubeProvider,
  [PROVIDERS.AUDIUS]: audiusProvider,
}

export function getProvider(providerId) {
  return registry[providerId]
}

export { PROVIDERS }
