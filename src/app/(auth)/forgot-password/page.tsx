import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[#f5ecdc] mb-2">
          Password dimenticata
        </h1>
        <p className="text-[#c9bca6] text-sm mb-8">
          Inseriscila tua email e ti invieremo un link per reimpostarla.
        </p>

        <ForgotPasswordForm />

        <p className="mt-8 text-sm text-[#c9bca6]">
          Torna al{' '}
          <Link
            href="/login"
            className="text-[#f5ecdc] underline underline-offset-4"
          >
            login
          </Link>
        </p>
      </div>
    </main>
  );
}
