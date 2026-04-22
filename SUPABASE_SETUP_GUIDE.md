# Guida Completa Supabase — Fentsi

> Progetto Next.js 15 + TypeScript + `@supabase/supabase-js` v2 + `@supabase/ssr`

---

## 1. Setup Dashboard Supabase (Browser)

### 1.1 Chiavi API (già configurate in `.env.local`)

Vai su **supabase.com → Il tuo progetto → Settings → API**

```env
# Queste chiavi sono già nel tuo .env.local — non ridistribuire mai il Service Role Key!

NEXT_PUBLIC_SUPABASE_URL=      # Project URL (sicuro da esporre lato client)
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Anon/public key (sicuro lato client, protetto dagli RLS)
SUPABASE_SERVICE_ROLE_KEY=     # ⚠️ SOLO server-side — bypassa gli RLS, non esporlo mai
```

**Regola d'oro:**
- `NEXT_PUBLIC_*` → usabili nel browser (le RLS ti proteggono)
- `SUPABASE_SERVICE_ROLE_KEY` → solo in API Routes e Server Components, mai in `'use client'`

---

### 1.2 Configura l'Autenticazione Email/Password

Vai su **Authentication → Providers → Email**

| Impostazione | Valore consigliato |
|---|---|
| Enable Email provider | ✅ ON |
| Confirm email | ✅ ON (sicurezza) — oppure OFF per sviluppo rapido |
| Secure email change | ✅ ON |
| Minimum password length | 6 |

---

### 1.3 Configura OAuth con Google

**Passo 1 — Google Cloud Console** (`console.cloud.google.com`):
1. Crea un progetto (o usa uno esistente)
2. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: aggiungi esattamente questo:
   ```
   https://<tuo-ref>.supabase.co/auth/v1/callback
   ```
   (sostituisci `<tuo-ref>` con il Project Reference ID che trovi in Supabase → Settings → General)
5. Copia **Client ID** e **Client Secret**

**Passo 2 — Dashboard Supabase**:
- **Authentication → Providers → Google → Enable**
- Incolla Client ID e Client Secret
- Salva

**Passo 3 — URL di redirect per sviluppo locale**:
- Vai su **Authentication → URL Configuration**
- In **Redirect URLs** aggiungi: `http://localhost:3000/auth/callback`
- Per produzione aggiungi anche: `https://tuo-dominio.com/auth/callback`

---

### 1.4 Configura OAuth con Apple (Sign in with Apple)

> Apple è più complessa: richiede un account Apple Developer (99€/anno) e HTTPS.

**Prerequisiti su Apple Developer** (`developer.apple.com`):
1. **Certificates, IDs & Profiles → Identifiers** → crea un **App ID** con "Sign In with Apple" abilitato
2. **Identifiers → Services IDs** → crea un **Service ID** (es. `com.fentsi.web`)
   - "Sign In with Apple" → Configure → aggiungi il tuo dominio e il redirect URL:
     ```
     https://<tuo-ref>.supabase.co/auth/v1/callback
     ```
3. **Keys** → crea una chiave con "Sign In with Apple" abilitato → scarica il file `.p8`
4. Prendi nota di: **Services ID**, **Team ID**, **Key ID**, contenuto del file **`.p8`**

**Dashboard Supabase**:
- **Authentication → Providers → Apple → Enable**
- Incolla tutti i valori sopra

> ⚠️ In sviluppo locale, Apple richiede HTTPS. Usa [ngrok](https://ngrok.com) o [localtunnel](https://theboroer.github.io/localtunnel-www/).

---

### 1.5 Configura i Template Email

Vai su **Authentication → Email Templates** per personalizzare:
- **Confirm signup** → email di conferma registrazione
- **Reset password** → email di reset password
- **Magic Link** → se vuoi abilitare login senza password

Esempio template conferma (personalizza con il brand Fentsi):
```html
<h2>Benvenuto su Fentsi!</h2>
<p>Clicca il link qui sotto per confermare il tuo account:</p>
<a href="{{ .ConfirmationURL }}">Conferma il mio account</a>
```

---

## 2. Schema Database e Migrazioni SQL

Le migrazioni sono già in `supabase/migrations/`. Eseguile nell'ordine:

### Esegui le Migration (SQL Editor)

Vai su **SQL Editor → New Query** e incolla il contenuto di ogni file in ordine.

Dopo l'esecuzione, dovresti avere:
- `public.events` — piani evento con RLS
- `public.profiles` — profili utente con RLS
- `public.vendors` — database fornitori
- Trigger `handle_new_user` → crea automaticamente il profilo al signup

---

## 3. Row Level Security (RLS) — Spiegazione e Best Practice

Le RLS sono già configurate nelle migrazioni. Ecco come funzionano e come modificarle.

### Come vedere le policy attive

**Table Editor → events → Policies** (o in SQL Editor):

```sql
-- Visualizza tutte le policy della tabella events
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'events';
```

### Policy correnti per `events`

```sql
-- Chiunque può creare un evento (anche utenti anonimi, per il wizard)
CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT WITH CHECK (true);

-- Gli utenti vedono solo i propri eventi (o quelli anonimi)
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Gli utenti modificano solo i propri eventi
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);
```

### Aggiungere una policy "solo utenti autenticati"

Se vuoi che **solo gli utenti loggati** possano inserire eventi (rimuove gli anonimi):

```sql
-- Nel SQL Editor di Supabase:
DROP POLICY IF EXISTS "Anyone can insert events" ON public.events;

CREATE POLICY "Only authenticated users can insert events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Policy per `profiles`

```sql
-- Gli utenti vedono solo il proprio profilo
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Gli utenti modificano solo il proprio profilo
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Il trigger può inserire profili (SECURITY DEFINER bypassa RLS)
-- Non serve una INSERT policy separata grazie al trigger
```

---

## 4. Esempi di Query al Database dal Browser

### 4.1 Leggere il profilo dell'utente corrente

```typescript
// In un componente 'use client'
import { getSupabase } from '@/lib/supabase'

async function getMyProfile() {
  const supabase = getSupabase()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    // auth.uid() viene passato automaticamente dall'anon key
    // Le RLS garantiscono che l'utente veda solo il proprio profilo
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (error) {
    console.error('Errore profilo:', error.message)
    return null
  }

  return profile
}
```

### 4.2 Creare un nuovo evento

```typescript
async function createEvent(data: Record<string, unknown>) {
  const supabase = getSupabase()

  // Ottieni l'utente corrente (null se anonimo)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      user_id: user?.id ?? null,  // null per utenti anonimi
      data: data,
      status: 'draft',
    })
    .select()  // ritorna il record inserito
    .single()

  if (error) throw new Error(`Errore creazione evento: ${error.message}`)

  return event
}
```

### 4.3 Leggere tutti gli eventi dell'utente

```typescript
async function getMyEvents() {
  const supabase = getSupabase()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, status, created_at, data->>"$.event_type" as event_type')
    // La RLS filtra automaticamente per user_id = auth.uid()
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return events
}
```

### 4.4 Aggiornare un evento

```typescript
async function updateEventStatus(eventId: string, status: string) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('events')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    // La RLS impedisce di modificare eventi altrui — non serve altro controllo

  if (error) throw new Error(`Errore aggiornamento: ${error.message}`)
}
```

### 4.5 Aggiornare il profilo utente

```typescript
async function updateProfile(updates: {
  full_name?: string
  company?: string
  avatar_url?: string
}) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Utente non autenticato')

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) throw new Error(`Errore profilo: ${error.message}`)
}
```

### 4.6 Query da un Server Component (con cookies)

```typescript
// In un Server Component o Route Handler
import { createServerSupabaseWithCookies } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseWithCookies()

  // Utente verificato lato server (più sicuro di getSession())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  return <div>{/* renderizza events */}</div>
}
```

### 4.7 Sottoscrizioni in tempo reale (Realtime)

```typescript
// Ascolta modifiche in tempo reale alla tabella events
// Nota: abilita Realtime per la tabella in Dashboard → Database → Replication

import { useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'

function useRealtimeEvents(onUpdate: () => void) {
  useEffect(() => {
    const supabase = getSupabase()

    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          console.log('Evento aggiornato:', payload)
          onUpdate()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onUpdate])
}
```

---

## 5. Come Proteggere le Rotte (già configurato in middleware.ts)

Il middleware `middleware.ts` gestisce già la protezione:

```typescript
// Rotte che richiedono autenticazione
const PROTECTED_ROUTES = ['/account', '/events']

// Rotte che redirectano al dashboard se già loggati
const AUTH_ROUTES = ['/login', '/signup']
```

Per aggiungere una nuova rotta protetta, aggiungi semplicemente il path a `PROTECTED_ROUTES`.

### Proteggere un componente lato client con `useAuth`

```typescript
'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedComponent() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Mentre si carica la sessione, non mostrare nulla
  if (isLoading) return <div>Caricamento...</div>
  if (!isAuthenticated) return null

  return (
    <div>
      Ciao, {user?.user_metadata?.full_name ?? user?.email}!
    </div>
  )
}
```

---

## 6. Checklist Finale

### Supabase Dashboard
- [ ] Email/Password provider abilitato
- [ ] Verifica email: ON (o OFF per sviluppo)
- [ ] Google OAuth configurato con Client ID + Secret
- [ ] Apple OAuth configurato (opzionale, richiede account Developer)
- [ ] Redirect URLs configurati: `http://localhost:3000/auth/callback` + dominio produzione
- [ ] Migration SQL eseguite (001_initial_schema.sql, 002_auth_security.sql)
- [ ] RLS abilitato su `events` e `profiles`
- [ ] (Opzionale) Realtime abilitato per `events`

### Codice (già aggiornato)
- [x] `lib/auth.ts` → usa Supabase nativo (`signIn`, `signUp`, `signOut`, OAuth)
- [x] `lib/auth-context.tsx` → usa `onAuthStateChange` + `getSession`
- [x] `app/login/page.tsx` → usa `useAuth()` + pulsanti Google/Apple
- [x] `app/signup/page.tsx` → usa `useAuth()` + pulsanti Google/Apple
- [x] `lib/supabase.ts` → client browser con PKCE (già corretto)
- [x] `lib/supabase-server.ts` → client server con cookies (già corretto)
- [x] `middleware.ts` → protezione rotte (già corretto)
- [x] `app/auth/callback/route.ts` → OAuth callback handler (già corretto)

---

## 7. Flusso Completo di Autenticazione

```
[BROWSER]
   │
   ├─ Email/Password ────────► supabase.auth.signInWithPassword()
   │                                    │
   │                                    ▼
   ├─ Google/Apple OAuth ────► supabase.auth.signInWithOAuth()
   │                                    │
   │                                    ▼
   │                          Redirect a provider OAuth
   │                                    │
   │                                    ▼
   │                          /auth/callback?code=...
   │                                    │
   │                                    ▼
   │                          exchangeCodeForSession()
   │                                    │
   │                                    ▼
   │                          Cookie di sessione salvati
   │                                    │
   │                                    ▼
   └─────────────────────────► onAuthStateChange → user & session aggiornati
                                                          │
                                                          ▼
                                                  Router push /dashboard

[SERVER / MIDDLEWARE]
   │
   └─ ogni request ──────────► middleware.ts → supabase.auth.getUser()
                                         ├─ non autenticato + rotta protetta → /login
                                         └─ autenticato + rotta auth → /dashboard
```
