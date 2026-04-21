import Link from 'next/link';
import { LoginButtons } from '../login/LoginButtons';
import { SignupForm } from '@/components/auth/SignupForm';

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, error } = await searchParams;
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true';

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#f5ecdc] mb-2">
          Crea il tuo account
        </h1>
        <p className="text-[#c9bca6] text-sm mb-8">
          Pianifica il tuo evento in pochi minuti con Fentsi.
        </p>

        <LoginButtons appleEnabled={appleEnabled} next={next} />

        <div className="flex items-center gap-3 w-full my-6 text-xs text-[#c9bca6]">
          <span className="h-px flex-1 bg-[#f5ecdc]/10" />
          <span>oppure</span>
          <span className="h-px flex-1 bg-[#f5ecdc]/10" />
        </div>

        <SignupForm next={next} />

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#e8816b]">
            Errore. Riprova.
          </p>
        )}

        <p className="mt-8 text-sm text-[#c9bca6]">
          Hai già un account?{' '}
          <Link
            href="/login"
            className="text-[#f5ecdc] underline underline-offset-4"
          >
            Accedi
          </Link>
        </p>
      </div>
    </main>
  );
}
