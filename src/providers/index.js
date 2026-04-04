import { youtubeProvider } from './youtubeProvider.js'
import { PROVIDERS } from './types.js'

const registry = {
  [PROVIDERS.YOUTUBE]: youtubeProvider,
}

export function getProvider(providerId) {
  return registry[providerId]
}

export { PROVIDERS }
