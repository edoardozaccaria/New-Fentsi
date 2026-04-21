'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Props = {
  appleEnabled: boolean;
  next?: string;
};

export function LoginButtons({ appleEnabled, next }: Props) {
  const [pending, setPending] = useState<null | 'google' | 'apple'>(null);
  const supabase = createSupabaseBrowserClient();

  async function signIn(provider: 'google' | 'apple') {
    setPending(provider);
    const redirect = new URL('/auth/callback', window.location.origin);
    if (next) redirect.searchParams.set('next', next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirect.toString() },
    });
    if (error) setPending(null);
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={pending !== null}
        className="flex items-center justify-center gap-3 h-12 rounded-md bg-white text-[#0b0a09] font-medium hover:bg-white/90 disabled:opacity-60 transition"
      >
        {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {appleEnabled && (
        <button
          type="button"
          onClick={() => signIn('apple')}
          disabled={pending !== null}
          className="flex items-center justify-center gap-3 h-12 rounded-md bg-black text-white font-medium hover:bg-black/90 disabled:opacity-60 transition"
        >
          {pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
        </button>
      )}
    </div>
  );
}
