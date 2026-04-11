import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomNav from './BottomNav.jsx'

vi.mock('../lib/supabase.js', () => ({ supabase: null }))

// Mutable player state so individual tests can override it
const playerState = { currentTrack: null, isPlaying: false }

vi.mock('../context/PlayerContext.jsx', () => ({
  usePlayer: () => playerState,
}))

describe('BottomNav', () => {
  it('renders all three tabs', () => {
    render(<BottomNav activeView="search" onNavigate={vi.fn()} />)
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
  })

  it('marks the active tab', () => {
    render(<BottomNav activeView="library" onNavigate={vi.fn()} />)
    const libraryBtn = screen.getByText('Library').closest('button')
    expect(libraryBtn).toHaveClass('active')
    const searchBtn = screen.getByText('Search').closest('button')
    expect(searchBtn).not.toHaveClass('active')
  })

  it('calls onNavigate with correct view when tabs clicked', () => {
    const onNavigate = vi.fn()
    render(<BottomNav activeView="search" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Library').closest('button'))
    expect(onNavigate).toHaveBeenCalledWith('library')
    fireEvent.click(screen.getByText('Search').closest('button'))
    expect(onNavigate).toHaveBeenCalledWith('search')
  })

  it('shows playing dot when isPlaying and currentTrack present', () => {
    playerState.currentTrack = { id: 'yt1', title: 'Song', thumbnail: null }
    playerState.isPlaying = true
    render(<BottomNav activeView="search" onNavigate={vi.fn()} />)
    expect(document.querySelector('.playing-dot')).toBeInTheDocument()
    // reset
    playerState.currentTrack = null
    playerState.isPlaying = false
  })
})
