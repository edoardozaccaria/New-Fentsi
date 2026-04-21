import { LoginButtons } from './LoginButtons';

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
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
          Accedi a Fentsi
        </h1>
        <p className="text-[#c9bca6] text-sm mb-8">
          Continua con il tuo account per pianificare il tuo evento.
        </p>
        <LoginButtons appleEnabled={appleEnabled} next={next} />
        {error && (
          <p role="alert" className="mt-4 text-sm text-[#e8816b]">
            {error === 'oauth'
              ? 'Accesso non riuscito. Riprova.'
              : error === 'no_code'
                ? 'Sessione non valida. Riprova.'
                : 'Si è verificato un errore.'}
          </p>
        )}
      </div>
    </main>
  );
}
