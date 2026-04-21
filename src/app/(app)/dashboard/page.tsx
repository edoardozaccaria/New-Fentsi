import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Dashboard — authenticated landing page.
 *
 * `proxy.ts` redirects all signed-out users away from `/dashboard` before
 * this component runs, but we still re-check on the server to keep the page
 * safe if the proxy matcher changes.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/dashboard');

  return (
    <main className="min-h-screen bg-[#0b0a09] text-[#f5ecdc] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mb-3">
          Ciao
          {user.user_metadata?.full_name
            ? `, ${user.user_metadata.full_name}`
            : ''}{' '}
          👋
        </h1>
        <p className="text-[#c9bca6] mb-10">
          Benvenutə nella tua area Fentsi. Da qui crei, consulti e gestisci i
          tuoi eventi.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/create-event/wizard"
            className="group rounded-2xl border border-[#f5ecdc]/10 bg-[#11100e] p-6 hover:border-[#e8816b]/40 transition"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">
              Nuovo evento
            </h2>
            <p className="text-sm text-[#c9bca6]">
              Avvia il wizard e ottieni un piano generato su misura.
            </p>
          </Link>

          <Link
            href="/checkout"
            className="group rounded-2xl border border-[#f5ecdc]/10 bg-[#11100e] p-6 hover:border-[#e8816b]/40 transition"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">
              Upgrade
            </h2>
            <p className="text-sm text-[#c9bca6]">
              Sblocca più eventi, fornitori premium e coordinamento.
            </p>
          </Link>
        </div>

        <form action="/auth/signout" method="post" className="mt-12">
          <button
            type="submit"
            className="text-sm text-[#c9bca6] hover:text-[#f5ecdc] underline underline-offset-4"
          >
            Esci
          </button>
        </form>
      </div>
    </main>
  );
}
