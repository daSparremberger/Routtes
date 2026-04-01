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
import { adminLoginWithFirebaseToken, setAdminToken } from '@/lib/management-api'
import { useRouter } from 'next/navigation'

interface AdminAuthState {
  user:            User | null
  role:            string | null
  loading:         boolean
  error:           string | null
  signInWithGoogle: () => Promise<void>
  logOut:          () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthState>({
  user: null, role: null, loading: true, error: null,
  signInWithGoogle: async () => {}, logOut: async () => {},
})

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [role,    setRole]    = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken()
          const { accessToken, role: r } = await adminLoginWithFirebaseToken(idToken)
          setAdminToken(accessToken)
          setRole(r)
          sessionStorage.setItem('admin_token', accessToken)
        } catch {
          setAdminToken(null)
          setRole(null)
        }
      } else {
        setAdminToken(null)
        setRole(null)
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
      router.push('/admin/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error && (err as { code?: string }).code === 'auth/popup-closed-by-user') return
      const msg = err instanceof Error ? err.message : 'Erro ao entrar'
      setError(msg.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '').trim())
    }
  }

  async function logOut() {
    await signOut(auth)
    setAdminToken(null)
    setRole(null)
    sessionStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  return (
    <AdminAuthContext.Provider value={{ user, role, loading, error, signInWithGoogle, logOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
