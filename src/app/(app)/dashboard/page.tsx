import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserPlanStatus } from '@/lib/plans';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/dashboard');

  const planStatus = await getUserPlanStatus(user.id);

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

        {/* Plan status badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#f5ecdc]/10 px-4 py-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: planStatus.tier === 'free' ? '#6b6258' : '#c9975b' }}
          />
          <span className="text-xs text-[#c9bca6]">
            {planStatus.tier === 'free'
              ? `Piano gratuito — ${planStatus.eventsCount}/1 piano usati`
              : `Piano ${planStatus.tier} — ${planStatus.eventsCount} piani creati`}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {planStatus.canCreateEvent ? (
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
          ) : (
            <Link
              href="/checkout"
              className="group rounded-2xl border border-[#e8816b]/30 bg-[#11100e] p-6 hover:border-[#e8816b]/60 transition"
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1 flex items-center gap-2">
                Nuovo evento
                <span className="text-sm font-normal text-[#e8816b]">🔒 Pro</span>
              </h2>
              <p className="text-sm text-[#c9bca6]">
                Hai usato il tuo piano gratuito. Passa a Pro per continuare.
              </p>
            </Link>
          )}

          <Link
            href="/checkout"
            className="group rounded-2xl border border-[#f5ecdc]/10 bg-[#11100e] p-6 hover:border-[#e8816b]/40 transition"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">
              {planStatus.tier === 'free' ? 'Upgrade a Pro' : 'Gestisci piano'}
            </h2>
            <p className="text-sm text-[#c9bca6]">
              {planStatus.tier === 'free'
                ? 'Sblocca più eventi, fornitori premium e coordinamento.'
                : 'Visualizza e gestisci la tua sottoscrizione.'}
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
