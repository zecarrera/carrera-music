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

  it('shows ✓ on main button when track is in at least one playlist', () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [{ ...track }], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    expect(screen.getByRole('button', { name: /manage playlists/i })).toHaveTextContent('✓')
  })

  it('opens playlist picker on click when playlists exist', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }))
    expect(await screen.findByText('Favs')).toBeInTheDocument()
  })

  it('opens picker even when track is already saved (to allow multi-playlist)', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [{ ...track }], createdAt: Date.now() },
      { id: 'pl2', name: 'Chill', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /manage playlists/i }))
    expect(await screen.findByText('Favs')).toBeInTheDocument()
    expect(screen.getByText('Chill')).toBeInTheDocument()
  })

  it('shows per-playlist checkmark for playlists containing the track', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [{ ...track }], createdAt: Date.now() },
      { id: 'pl2', name: 'Chill', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /manage playlists/i }))
    const favsBtn = (await screen.findByText('Favs')).closest('button')
    const chillBtn = screen.getByText('Chill').closest('button')
    expect(favsBtn).toHaveClass('atpb-in-playlist')
    expect(chillBtn).not.toHaveClass('atpb-in-playlist')
  })

  it('adds track to a second playlist without removing from the first', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [{ ...track }], createdAt: Date.now() },
      { id: 'pl2', name: 'Chill', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /manage playlists/i }))
    fireEvent.click(await screen.findByText('Chill'))
    expect(screen.getByRole('button', { name: /manage playlists/i })).toHaveTextContent('✓')
  })

  it('shows "No playlists yet" when no playlists exist', async () => {
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }))
    expect(await screen.findByText(/no playlists yet/i)).toBeInTheDocument()
  })

  it('opens menu downward when button is near top of screen', async () => {
    localStorage.setItem('cm_playlists', JSON.stringify([
      { id: 'pl1', name: 'Favs', tracks: [], createdAt: Date.now() },
    ]))
    renderWithProviders(<AddToPlaylistBtn track={track} />)
    const btn = screen.getByRole('button', { name: /add to playlist/i })
    vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({ top: 80, bottom: 116, left: 0, right: 36, width: 36, height: 36 })
    fireEvent.click(btn)
    const menu = await screen.findByText('Favs')
    expect(menu.closest('.atpb-menu')).toHaveClass('atpb-menu-down')
  })
})
