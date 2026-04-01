const MGMT_URL = (
  process.env.NEXT_PUBLIC_MANAGEMENT_API_URL ??
  'https://management-api-production-190a.up.railway.app'
).replace(/\/$/, '')

let adminToken: string | null = null

export function setAdminToken(token: string | null) {
  adminToken = token
}

export function getAdminToken() {
  return adminToken
}

export class MgmtApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'MgmtApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    ...(init?.headers ?? {}),
  }
  const res = await fetch(`${MGMT_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.text()
    throw new MgmtApiError(res.status, body)
  }
  return res.json() as Promise<T>
}

export const mgmt = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown)=> request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)               => request<T>(path, { method: 'DELETE' }),
}

export interface AdminLoginResponse {
  accessToken: string
  role:        string
}

export async function adminLoginWithFirebaseToken(idToken: string): Promise<AdminLoginResponse> {
  const res = await fetch(`${MGMT_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ idToken }),
  })
  if (!res.ok) throw new MgmtApiError(res.status, await res.text())
  return res.json()
}
