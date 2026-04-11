/**
 * Render helper that wraps components with all required providers.
 * Supabase is mocked to null so PlaylistContext uses localStorage-only mode.
 */
import { render } from '@testing-library/react'
import { PlaylistProvider } from '../context/PlaylistContext.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'

// Stub Supabase — prevents real network calls in tests
vi.mock('../lib/supabase.js', () => ({ supabase: null }))

export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <AuthProvider>
        <PlaylistProvider>
          {children}
        </PlaylistProvider>
      </AuthProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
