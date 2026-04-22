/**
 * Funzioni di autenticazione native Supabase per Fentsi.
 *
 * IMPORTANTE: questo file sostituisce il vecchio approccio basato su un
 * backend Express custom (apiFetch). Ora tutte le operazioni di auth parlano
 * direttamente con Supabase, che gestisce sessioni, cookie e sicurezza.
 *
 * Pattern usato: PKCE (Proof Key for Code Exchange) — il più sicuro per le
 * app web che non possono mantenere segreti lato client.
 */

import { getSupabase } from './supabase'

// ── Tipi ─────────────────────────────────────────────────────────────────────

export interface SignUpResult {
  /** true se Supabase ha inviato un'email di conferma (verifica email abilitata) */
  needsVerification: boolean
}

// ── Registrazione (Sign Up) ───────────────────────────────────────────────────

/**
 * Registra un nuovo utente con email e password.
 * Se la verifica email è abilitata nella dashboard Supabase, l'utente riceve
 * un'email di conferma e `needsVerification` sarà true.
 * Il trigger SQL `handle_new_user` creerà automaticamente il profilo in `public.profiles`.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<SignUpResult> {
  const supabase = getSupabase()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // I metadata vengono copiati in `public.profiles` dal trigger SQL
      data: { full_name: fullName },
    },
  })

  if (error) {
    // Traduciamo i messaggi di errore Supabase in messaggi leggibili
    if (error.message.toLowerCase().includes('already registered')) {
      throw new Error('Questa email è già registrata. Prova ad accedere.')
    }
    if (error.message.toLowerCase().includes('password should be at least')) {
      throw new Error('La password deve essere di almeno 6 caratteri.')
    }
    if (error.message.toLowerCase().includes('invalid email')) {
      throw new Error('Inserisci un indirizzo email valido.')
    }
    throw new Error(error.message)
  }

  // Se `session` è null, Supabase ha inviato l'email di conferma
  // Se `session` esiste, l'utente è già autenticato (verifica email disabilitata)
  return { needsVerification: !data.session }
}

// ── Accesso (Sign In) ─────────────────────────────────────────────────────────

/**
 * Autentica un utente esistente con email e password.
 * La sessione viene automaticamente salvata nei cookie da Supabase SSR.
 * Il cambio di stato viene propagato a tutti i listener via `onAuthStateChange`.
 */
export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Email o password non corretti. Riprova.')
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'Email non ancora verificata. Controlla la tua casella di posta.'
      )
    }
    if (error.message.toLowerCase().includes('too many requests')) {
      throw new Error('Troppi tentativi. Attendi qualche minuto e riprova.')
    }
    throw new Error(error.message)
  }
}

// ── Uscita (Sign Out) ─────────────────────────────────────────────────────────

/**
 * Disconnette l'utente corrente e invalida la sessione lato Supabase.
 * I cookie di sessione vengono rimossi automaticamente.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// ── OAuth: Google ─────────────────────────────────────────────────────────────

/**
 * Avvia il flusso OAuth con Google.
 * Redirige l'utente a Google per l'autenticazione, poi torna su /auth/callback.
 *
 * PREREQUISITI DASHBOARD SUPABASE:
 * Authentication → Providers → Google → Enable
 * Inserire Client ID e Client Secret da Google Cloud Console.
 * Aggiungere come Authorized redirect URI:
 *   https://<ref>.supabase.co/auth/v1/callback
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Dopo il login Google, Supabase rimanda qui per scambiare il codice PKCE
      redirectTo: `${window.location.origin}/auth/callback`,
      // Scope minimi per email e nome del profilo
      scopes: 'openid email profile',
    },
  })

  if (error) throw new Error(error.message)
}

// ── OAuth: Apple ──────────────────────────────────────────────────────────────

/**
 * Avvia il flusso OAuth con Apple (Sign in with Apple).
 *
 * PREREQUISITI DASHBOARD SUPABASE:
 * Authentication → Providers → Apple → Enable
 * Inserire: Services ID, Team ID, Key ID, Private Key (da Apple Developer).
 * Nota: Apple richiede HTTPS anche in sviluppo (usa ngrok o simili).
 */
export async function signInWithApple(): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw new Error(error.message)
}

// ── Reset password ────────────────────────────────────────────────────────────

/**
 * Invia un'email con il link per reimpostare la password.
 * L'utente clicca il link e viene rediretto a /auth/reset-password
 * dove può impostare la nuova password con `updatePassword`.
 */
export async function forgotPassword(email: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw new Error(error.message)
}

/**
 * Aggiorna la password dell'utente autenticato.
 * Da chiamare nella pagina /auth/reset-password dopo che l'utente
 * ha cliccato il link di reset e ha una sessione attiva.
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
