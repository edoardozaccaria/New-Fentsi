'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Email / password signup form.
 *
 * Adapted from legacy Fentsi (app/signup/page.tsx) — the legacy flow
 * used an AuthContext wrapper; here we call `supabase.auth.signUp()`
 * directly since the new codebase has no client-side auth context.
 */
export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailRedirectTo = new URL('/auth/callback', window.location.origin);
    if (next) emailRedirectTo.searchParams.set('next', next);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: emailRedirectTo.toString(),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is OFF in Supabase, the user is signed in right away.
    if (data.session) {
      router.push(next ?? '/dashboard');
      router.refresh();
      return;
    }

    // Otherwise, wait for the user to confirm via email link.
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="w-full text-left rounded-xl border border-[#f5ecdc]/10 bg-[#11100e] p-5">
        <h2 className="text-[#f5ecdc] font-medium mb-1">
          Controlla la tua email
        </h2>
        <p className="text-sm text-[#c9bca6]">
          Ti abbiamo inviato un link di conferma a <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col gap-3 text-left"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[#c9bca6]">Nome e cognome</span>
        <input
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-11 rounded-md bg-[#11100e] border border-[#f5ecdc]/10 px-3 text-[#f5ecdc] placeholder:text-[#c9bca6]/40 focus:outline-none focus:border-[#e8816b]/60"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[#c9bca6]">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-md bg-[#11100e] border border-[#f5ecdc]/10 px-3 text-[#f5ecdc] placeholder:text-[#c9bca6]/40 focus:outline-none focus:border-[#e8816b]/60"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[#c9bca6]">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-md bg-[#11100e] border border-[#f5ecdc]/10 px-3 text-[#f5ecdc] placeholder:text-[#c9bca6]/40 focus:outline-none focus:border-[#e8816b]/60"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-[#e8816b]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 rounded-md bg-[#f5ecdc] text-[#0b0a09] font-medium hover:bg-[#f5ecdc]/90 disabled:opacity-60 transition"
      >
        {loading ? 'Creazione account…' : 'Crea account'}
      </button>
    </form>
  );
}
