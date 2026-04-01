'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { loginWithFirebaseToken, setAccessToken } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface AuthState {
  user:            User | null
  tenantId:        string | null
  loading:         boolean
  error:           string | null
  signInWithGoogle: () => Promise<void>
  logOut:          () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null, tenantId: null, loading: true, error: null,
  signInWithGoogle: async () => {}, logOut: async () => {},
})

async function exchangeToken(firebaseUser: User) {
  const idToken = await firebaseUser.getIdToken()
  const { accessToken, refreshToken, tenantId } = await loginWithFirebaseToken(idToken)
  setAccessToken(accessToken)
  sessionStorage.setItem('rt', refreshToken)
  return tenantId
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const tid = await exchangeToken(firebaseUser)
          setTenantId(tid)
        } catch {
          setAccessToken(null)
          setTenantId(null)
        }
      } else {
        setAccessToken(null)
        setTenantId(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signInWithGoogle() {
    setError(null)
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      router.push('/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error && (err as { code?: string }).code === 'auth/popup-closed-by-user') return
      const msg = err instanceof Error ? err.message : 'Erro ao entrar com Google'
      setError(msg.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '').trim())
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
    <AuthContext.Provider value={{ user, tenantId, loading, error, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
