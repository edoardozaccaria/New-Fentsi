/**
 * Server-only Supabase utilities.
 * Uses next/headers — can only be imported in Server Components, Route Handlers, and Middleware.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './supabase'

// ── Server client with cookies (for Server Components & Route Handlers) ─────
export async function createServerSupabaseWithCookies() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Cannot set cookies in Server Components — only in Route Handlers/Middleware
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Cannot remove cookies in Server Components
        }
      },
    },
  })
}

// ── Helper: get current user from cookies (for API routes) ──────────────────
export async function getServerUser() {
  try {
    const supabase = await createServerSupabaseWithCookies()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}
