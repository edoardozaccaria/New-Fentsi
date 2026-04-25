'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PaywallModal({ open, onClose }: Props) {
  const router = useRouter();

  function goToCheckout() {
    onClose();
    router.push('/checkout');
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{
            background: 'rgba(11,10,9,0.85)',
            backdropFilter: 'blur(4px)',
          }}
        />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border p-8 space-y-6 outline-none"
          style={{ background: '#131110', borderColor: '#2a2520' }}
        >
          <div className="space-y-2">
            <Dialog.Title
              className="font-serif text-xl"
              style={{ color: '#f0ebe3' }}
            >
              Hai usato il tuo piano gratuito
            </Dialog.Title>
            <Dialog.Description className="text-sm" style={{ color: '#6b6258' }}>
              Il piano gratuito include 1 evento completo. Passa a Pro per
              creare fino a 30 piani al mese con fornitori premium.
            </Dialog.Description>
          </div>

          <ul className="space-y-2 text-sm" style={{ color: '#e8dfcd' }}>
            {[
              'Fino a 30 piani/mese',
              'Fornitori premium filtrati per budget',
              'Richiesta preventivi illimitata',
              'Export PDF del piano',
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span style={{ color: '#e8816b' }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <button
              type="button"
              onClick={goToCheckout}
              className="w-full py-3 rounded-xl font-medium text-sm tracking-wide transition-opacity"
              style={{ background: '#c9975b', color: '#0b0a09' }}
            >
              Upgrade a Pro — €29/mese
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm"
              style={{ color: '#6b6258' }}
            >
              Torna indietro
            </button>
          </div>

          <Dialog.Close
            className="absolute top-5 right-5 text-xs"
            style={{ color: '#4a4540' }}
          >
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
