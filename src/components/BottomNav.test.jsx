import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomNav from './BottomNav.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

const playerState = { currentTrack: null, isPlaying: false }
vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => playerState,
}))

const authState = { isAnonymous: true }
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => authState,
}))

describe('BottomNav', () => {
  it('renders all four tabs', () => {
    render(<BottomNav activeView="search" onNavigate={vi.fn()} onOpenAccount={vi.fn()} />)
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('Playlists')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('marks the active tab', () => {
    render(<BottomNav activeView="library" onNavigate={vi.fn()} onOpenAccount={vi.fn()} />)
    const libraryBtn = screen.getByText('Playlists').closest('button')
    expect(libraryBtn).toHaveClass('active')
    const searchBtn = screen.getByText('Search').closest('button')
    expect(searchBtn).not.toHaveClass('active')
  })

  it('calls onNavigate with correct view when tabs clicked', () => {
    const onNavigate = vi.fn()
    render(<BottomNav activeView="search" onNavigate={onNavigate} onOpenAccount={vi.fn()} />)
    fireEvent.click(screen.getByText('Playlists').closest('button'))
    expect(onNavigate).toHaveBeenCalledWith('library')
    fireEvent.click(screen.getByText('Search').closest('button'))
    expect(onNavigate).toHaveBeenCalledWith('search')
  })

  it('shows playing dot when isPlaying and currentTrack present', () => {
    playerState.currentTrack = { id: 'yt1', title: 'Song', thumbnail: null }
    playerState.isPlaying = true
    render(<BottomNav activeView="search" onNavigate={vi.fn()} onOpenAccount={vi.fn()} />)
    expect(document.querySelector('.playing-dot')).toBeInTheDocument()
    playerState.currentTrack = null
    playerState.isPlaying = false
  })

  it('shows "Login" label and no signed-in class when anonymous', () => {
    authState.isAnonymous = true
    render(<BottomNav activeView="search" onNavigate={vi.fn()} onOpenAccount={vi.fn()} />)
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).not.toHaveClass('nav-btn-signed-in')
  })

  it('shows "Logout" label and signed-in class when logged in', () => {
    authState.isAnonymous = false
    render(<BottomNav activeView="search" onNavigate={vi.fn()} onOpenAccount={vi.fn()} />)
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toHaveClass('nav-btn-signed-in')
    authState.isAnonymous = true
  })

  it('calls onOpenAccount when account tab clicked', () => {
    authState.isAnonymous = true
    const onOpenAccount = vi.fn()
    render(<BottomNav activeView="search" onNavigate={vi.fn()} onOpenAccount={onOpenAccount} />)
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    expect(onOpenAccount).toHaveBeenCalled()
  })
})
