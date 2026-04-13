import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else {
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (!error) setUser(data.user)
          setLoading(false)
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    // Upgrade the current anonymous session to a named account in-place.
    // user.id stays the same, so all existing playlists carry over automatically.
    const { data, error } = await supabase.auth.updateUser({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    // Re-sign in anonymously so the app stays functional without a session
    const { data } = await supabase.auth.signInAnonymously()
    if (data?.user) setUser(data.user)
  }

  const isAnonymous = user?.is_anonymous ?? true

  return (
    <AuthContext.Provider value={{ user, loading, isAnonymous, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
