/**
 * API client for the Fentsi Express/Fastify backend.
 * Handles JWT auth headers, automatic token refresh, and base URL configuration.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

// ── Token storage (client-side only) ─────────────────────────────────────────
let accessToken: string | null = null

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('fentsi_access_token')
  }
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('fentsi_access_token', token)
    else localStorage.removeItem('fentsi_access_token')
  }
}

// ── Session ID for anonymous wizard usage ────────────────────────────────────
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('fentsi_session_id')
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem('fentsi_session_id', sid)
  }
  return sid
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Skip automatic auth header */
  noAuth?: boolean
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refresh cookie
    })
    if (!res.ok) return null
    const data = await res.json()
    setAccessToken(data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, noAuth, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  // Add auth header if we have a token
  if (!noAuth) {
    const token = getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Add session ID for anonymous usage
  const sessionId = getSessionId()
  if (sessionId) {
    headers['X-Session-Id'] = sessionId
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

  let res = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include', // always send cookies for refresh token
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // If 401 and we had a token, try refreshing
  if (res.status === 401 && !noAuth && getAccessToken()) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, {
        ...rest,
        headers,
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    }
  }

  if (!res.ok) {
    let errorBody: { error?: string; message?: string; details?: unknown }
    try {
      errorBody = await res.json()
    } catch {
      errorBody = { message: res.statusText }
    }
    throw new ApiError(
      res.status,
      errorBody.error || 'unknown_error',
      errorBody.message || `Request failed with status ${res.status}`,
      errorBody.details
    )
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}
