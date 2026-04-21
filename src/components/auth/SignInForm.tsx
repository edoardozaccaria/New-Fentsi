'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Email / password sign-in form.
 *
 * Adapted from legacy Fentsi (app/login/page.tsx) — calls
 * `supabase.auth.signInWithPassword` directly (no AuthContext).
 */
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(next ?? '/dashboard');
    router.refresh();
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
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#c9bca6]">Password</span>
          <Link
            href="/forgot-password"
            className="text-xs text-[#c9bca6] hover:text-[#f5ecdc] underline underline-offset-4"
          >
            Dimenticata?
          </Link>
        </div>
        <input
          type="password"
          required
          autoComplete="current-password"
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
        {loading ? 'Accesso…' : 'Accedi'}
      </button>
    </form>
  );
}
