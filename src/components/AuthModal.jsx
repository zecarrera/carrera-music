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

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      onDismiss()
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
