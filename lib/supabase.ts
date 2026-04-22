import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ── Types for our database ──────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          user_id: string | null
          data: Record<string, unknown>
          plan: Record<string, unknown> | null
          status: 'draft' | 'planning' | 'completed' | 'error'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          data: Record<string, unknown>
          plan?: Record<string, unknown> | null
          status?: 'draft' | 'planning' | 'completed' | 'error'
        }
        Update: Partial<{
          data: Record<string, unknown>
          plan: Record<string, unknown> | null
          status: 'draft' | 'planning' | 'completed' | 'error'
        }>
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          company: string | null
          avatar_url: string | null
          role: 'user' | 'planner' | 'venue' | 'admin'
          stripe_customer_id: string | null
          subscription_status: 'free' | 'trialing' | 'active' | 'canceled' | 'past_due'
          subscription_tier: 'free' | 'single' | 'pro' | 'agency'
          events_count: number
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
        }
        Update: Partial<{
          full_name: string | null
          company: string | null
          avatar_url: string | null
          stripe_customer_id: string | null
          subscription_status: string
          subscription_tier: string
        }>
      }
    }
  }
}

// ── Browser client (for client components) ──────────────────────────────────
let browserClient: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  browserClient = createClient<Database>(url, key, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

// ── Service role client (for API routes that bypass RLS) ────────────────────
export function createServerSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
