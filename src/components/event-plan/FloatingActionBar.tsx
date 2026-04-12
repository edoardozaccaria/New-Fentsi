'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// FloatingActionBar — sticky bottom bar with Share | Save | Export PDF
// ---------------------------------------------------------------------------

export function FloatingActionBar({ planUrl }: { planUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(planUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select the URL text
    }
  }

  function handleSave() {
    // For MVP: redirect to sign-in if not authenticated.
    // Auth state is server-side; this client component shows a simple alert.
    alert('Accedi per salvare il piano nel tuo account.');
  }

  function handleExportPdf() {
    // Pro feature — show paywall stub.
    alert(
      'Esporta in PDF è disponibile per i piani Pro. Upgrade per continuare.'
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-4 border-t"
      style={{
        background: 'rgba(11,10,9,0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: '#2a2520',
      }}
    >
      {/* Share */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors"
        style={{
          background: copied ? '#0f2010' : '#111009',
          borderColor: copied ? '#2a5a2a' : '#2a2520',
          color: copied ? '#6acc6a' : '#9a8f86',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {copied ? 'Link copiato!' : 'Condividi link'}
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors"
        style={{
          background: '#111009',
          borderColor: '#2a2520',
          color: '#9a8f86',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Salva piano
      </button>

      {/* Export PDF — Pro */}
      <button
        onClick={handleExportPdf}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-opacity"
        style={{
          background: '#1a1410',
          border: '1px solid #c9975b',
          color: '#c9975b',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        Esporta PDF
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: '#2a1f10', color: '#c9975b', fontSize: 10 }}
        >
          PRO
        </span>
      </button>
    </div>
  );
}
