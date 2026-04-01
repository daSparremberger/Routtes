const API_URL = (process.env.NEXT_PUBLIC_APP_API_URL ?? 'https://app-api-production-ee8f.up.railway.app').replace(/\/$/, '')

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init?.headers ?? {}),
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body)
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  get:    <T>(path: string)                       => request<T>(path),
  post:   <T>(path: string, body: unknown)        => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)        => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                       => request<T>(path, { method: 'DELETE' }),
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export interface LoginResponse {
  accessToken:  string
  refreshToken: string
  tenantId:     string
}

export async function loginWithFirebaseToken(idToken: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ idToken }),
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
