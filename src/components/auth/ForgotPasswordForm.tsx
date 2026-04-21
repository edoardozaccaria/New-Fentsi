'use client';

import { useState, type FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Password-reset form.
 *
 * Adapted from legacy Fentsi (app/forgot-password/page.tsx) — calls
 * `supabase.auth.resetPasswordForEmail` directly.
 */
export function ForgotPasswordForm() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = new URL('/auth/callback', window.location.origin);
    redirectTo.searchParams.set('next', '/dashboard');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

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
          Se esiste un account per <strong>{email}</strong>, ti abbiamo inviato
          un link di reset.
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
        {loading ? 'Invio…' : 'Invia link di reset'}
      </button>
    </form>
  );
}
