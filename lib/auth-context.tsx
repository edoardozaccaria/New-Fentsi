'use client'

/**
 * Contesto di autenticazione Supabase per Fentsi.
 *
 * Usa `onAuthStateChange` di Supabase per reagire in tempo reale a:
 * - Login con email/password
 * - Login OAuth (Google, Apple)
 * - Logout
 * - Refresh automatico del token (ogni ~1h)
 * - Caricamento della sessione già presente al refresh della pagina
 *
 * L'intera applicazione è avvolta da <AuthProvider> in app/layout.tsx
 * tramite il componente Providers. Qualsiasi componente figlio può
 * accedere all'utente corrente con l'hook `useAuth()`.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import { signIn, signUp, signOut, type SignUpResult } from './auth'

// ── Tipi del contesto ────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Utente Supabase autenticato (null se non loggato o in caricamento) */
  user: User | null
  /** Sessione Supabase corrente (contiene access_token, refresh_token, ecc.) */
  session: Session | null
  /** true mentre si carica la sessione iniziale (evita flash di contenuto protetto) */
  isLoading: boolean
  /** true se l'utente è loggato e la sessione è valida */
  isAuthenticated: boolean
  /** Accede con email e password */
  login: (email: string, password: string) => Promise<void>
  /** Registra un nuovo utente e indica se serve la verifica email */
  register: (email: string, password: string, fullName: string) => Promise<SignUpResult>
  /** Disconnette l'utente e invalida la sessione */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    // ── 1. Carica la sessione esistente al primo render ──────────────────────
    // Necessario per mantenere l'utente loggato dopo un refresh della pagina.
    // La sessione è persistita nei cookie (gestiti da @supabase/ssr + middleware).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // ── 2. Ascolta tutti i cambiamenti di stato auth in tempo reale ──────────
    // Questo callback si triggera su: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED,
    // USER_UPDATED, PASSWORD_RECOVERY, ecc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Pulizia: rimuove il listener quando AuthProvider si smonta
    return () => subscription.unsubscribe()
  }, [])

  // ── Funzioni esposte al contesto ─────────────────────────────────────────

  /**
   * Login con email e password.
   * Lo stato di user/session si aggiorna automaticamente via onAuthStateChange.
   */
  const login = async (email: string, password: string): Promise<void> => {
    await signIn(email, password)
  }

  /**
   * Registrazione di un nuovo utente.
   * Ritorna `needsVerification: true` se Supabase richiede la conferma email.
   */
  const register = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<SignUpResult> => {
    return signUp(email, password, fullName)
  }

  /**
   * Logout: invalida la sessione su Supabase e svuota lo stato locale.
   * Il middleware Next.js reindirizzerà automaticamente le rotte protette.
   */
  const logout = async (): Promise<void> => {
    await signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook pubblico ─────────────────────────────────────────────────────────────

/**
 * Hook per accedere al contesto di autenticazione.
 * Deve essere usato SOLO in componenti Client ('use client') all'interno di <AuthProvider>.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth()
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error(
      "useAuth() deve essere chiamato all'interno di un componente avvolto da <AuthProvider>."
    )
  }
  return ctx
}
