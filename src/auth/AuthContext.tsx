import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Profile = { id: string; handle: string; role: 'user' | 'admin'; has_face: boolean }
type Ctx = {
  session: Session | null; profile: Profile | null; loading: boolean; balance: number | null
  refreshBalance: () => Promise<void>
  signOut: () => Promise<void>; refreshProfile: () => Promise<void>
}

const AuthCtx = createContext<Ctx>({
  session: null, profile: null, loading: true, balance: null, refreshBalance: async () => {}, signOut: async () => {}, refreshProfile: async () => {},
})
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const userId = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userId.current = data.session?.user.id ?? null
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s && s.user.id !== userId.current) setLoading(true)
      userId.current = s?.user.id ?? null
      setSession((prev) => (prev && s && prev.user.id === s.user.id ? prev : s))
      setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  const refreshProfile = useCallback(async () => {
    if (!ready) return
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return
    }
    const { data } = await supabase.from('profile_public').select('id, handle, role, has_face').eq('id', uid).single()
    setProfile(data as Profile | null)
    setLoading(false)
  }, [uid, ready])

  const refreshBalance = useCallback(async () => {
    if (!uid) return setBalance(null)
    const { data } = await supabase.rpc('my_balance')
    setBalance(data == null ? null : Number(data))
  }, [uid])

  useEffect(() => { void refreshProfile() }, [refreshProfile])
  useEffect(() => { void refreshBalance() }, [refreshBalance])

  return (
    <AuthCtx.Provider value={{ session, profile, loading, balance, refreshBalance, refreshProfile, signOut: async () => void (await supabase.auth.signOut()) }}>
      {children}
    </AuthCtx.Provider>
  )
}
