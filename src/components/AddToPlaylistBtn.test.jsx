import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../__tests__/test-utils.jsx'
import AddToPlaylistBtn from '../components/AddToPlaylistBtn.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

const track = { id: 'yt1', title: 'Song A', artist: 'Artist A', thumbnail: null }

describe('AddToPlaylistBtn', () => {
  beforeEach(() => localStorage.clear())

  it('shows + when track is not in any playlist', () => {
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    expect(screen.getByRole('button', { name: /add to playlist/i })).toHaveTextContent('+')
  })

  it('opens playlist picker on + click when playlists exist', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }))
    expect(await screen.findByText('Favs')).toBeInTheDocument()
  })

  it('shows "No playlists yet" when no playlists exist', async () => {
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }))
    expect(await screen.findByText(/no playlists yet/i)).toBeInTheDocument()
  })

  it('shows ✓ after adding track to a playlist', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }))
    fireEvent.click(await screen.findByText('Favs'))
    expect(screen.getByRole('button', { name: /remove from playlist/i })).toHaveTextContent('✓')
  })

  it('removes track from playlist when ✓ is clicked', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [{ ...track }], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    const btn = screen.getByRole('button', { name: /remove from playlist/i })
    expect(btn).toHaveTextContent('✓')
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: /add to playlist/i })).toHaveTextContent('+')
  })
})
