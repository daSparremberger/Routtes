'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { loginWithFirebaseToken, setAccessToken } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface AuthState {
  user:      User | null
  tenantId:  string | null
  loading:   boolean
  error:     string | null
  signIn:    (email: string, password: string) => Promise<void>
  logOut:    () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null, tenantId: null, loading: true, error: null,
  signIn: async () => {}, logOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const router = useRouter()

  // Exchange Firebase token for app-api JWT
  async function exchangeToken(firebaseUser: User) {
    try {
      const idToken = await firebaseUser.getIdToken()
      const { accessToken, tenantId: tid } = await loginWithFirebaseToken(idToken)
      setAccessToken(accessToken)
      setTenantId(tid)
      // Store refresh token in sessionStorage (never in localStorage for security)
      sessionStorage.setItem('rt', (await loginWithFirebaseToken(idToken)).refreshToken)
    } catch {
      setAccessToken(null)
      setTenantId(null)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await exchangeToken(firebaseUser)
      } else {
        setAccessToken(null)
        setTenantId(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signIn(email: string, password: string) {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar'
      setError(msg.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '').trim())
      throw err
    }
  }

  async function logOut() {
    await signOut(auth)
    setAccessToken(null)
    setTenantId(null)
    sessionStorage.removeItem('rt')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, tenantId, loading, error, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
