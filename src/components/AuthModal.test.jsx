import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import AuthModal from '../components/AuthModal.jsx'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ signIn: mockSignIn, signUp: mockSignUp }),
}))

function renderModal(props = {}) {
  return render(<AuthModal onDismiss={vi.fn()} {...props} />)
}

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({})
    mockSignUp.mockResolvedValue({})
  })

  it('renders Sign in tab active by default', () => {
    renderModal()
    const tabs = document.querySelectorAll('.auth-tab')
    expect(tabs[0]).toHaveClass('auth-tab-active')
    expect(tabs[1]).not.toHaveClass('auth-tab-active')
  })

  it('renders Create account tab active when initialTab="signup"', () => {
    renderModal({ initialTab: 'signup' })
    const tabs = document.querySelectorAll('.auth-tab')
    expect(tabs[1]).toHaveClass('auth-tab-active')
    expect(tabs[0]).not.toHaveClass('auth-tab-active')
  })

  it('switches tabs on click', () => {
    renderModal()
    const tabs = document.querySelectorAll('.auth-tab')
    fireEvent.click(tabs[1]) // Create account tab
    expect(tabs[1]).toHaveClass('auth-tab-active')
    expect(tabs[0]).not.toHaveClass('auth-tab-active')
  })

  it('calls signIn with email and password on submit in sign in tab', async () => {
    const onDismiss = vi.fn()
    render(<AuthModal onDismiss={onDismiss} />)
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass123' } })
    fireEvent.submit(document.querySelector('.auth-form'))
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'pass123'))
    await waitFor(() => expect(onDismiss).toHaveBeenCalled())
  })

  it('calls signUp on submit in create account tab', async () => {
    const onDismiss = vi.fn()
    render(<AuthModal initialTab="signup" onDismiss={onDismiss} />)
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'new@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass123' } })
    fireEvent.submit(document.querySelector('.auth-form'))
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith('new@b.com', 'pass123'))
    await waitFor(() => expect(onDismiss).toHaveBeenCalled())
  })

  it('shows error message when signIn fails', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'))
    renderModal()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.submit(document.querySelector('.auth-form'))
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument())
  })

  it('clears error when switching tabs', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'))
    renderModal()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.submit(document.querySelector('.auth-form'))
    await waitFor(() => screen.getByText('Invalid credentials'))
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
  })

  it('calls onDismiss when "Continue without account" is clicked', () => {
    const onDismiss = vi.fn()
    render(<AuthModal onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /continue without account/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
