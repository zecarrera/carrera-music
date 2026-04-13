import { useAuth } from '../context/AuthContext.jsx'
import './AccountSheet.css'

export default function AccountSheet({ onDismiss }) {
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    onDismiss()
  }

  return (
    <div className="acct-overlay" onClick={onDismiss}>
      <div className="acct-sheet" onClick={e => e.stopPropagation()}>
        <div className="acct-email">📧 {user?.email}</div>
        <button className="acct-signout" onClick={handleSignOut}>Sign out</button>
        <button className="acct-dismiss" onClick={onDismiss}>Cancel</button>
      </div>
    </div>
  )
}
