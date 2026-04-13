import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import './AuthModal.css'

export default function AuthModal({ initialTab = 'signin', onDismiss }) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        await signIn(email, password)
        onDismiss()
      } else {
        await signUp(email, password)
        // Show confirmation screen — user must verify before session upgrades
        setEmailSent(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchTab(t) {
    setTab(t)
    setError(null)
  }

  if (emailSent) {
    return (
      <div className="auth-overlay" onClick={onDismiss}>
        <div className="auth-modal auth-modal-confirm" onClick={e => e.stopPropagation()}>
          <div className="auth-confirm-icon">📬</div>
          <h2 className="auth-confirm-title">Check your email</h2>
          <p className="auth-confirm-body">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account — your existing playlists will carry over automatically.
          </p>
          <button className="auth-dismiss" onClick={onDismiss}>
            Continue for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-overlay" onClick={onDismiss}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'signin' ? 'auth-tab-active' : ''}`}
            onClick={() => switchTab('signin')}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'auth-tab-active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button className="auth-dismiss" onClick={onDismiss}>
          Continue without account
        </button>
      </div>
    </div>
  )
}
