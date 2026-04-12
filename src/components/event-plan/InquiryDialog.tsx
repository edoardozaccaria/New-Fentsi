'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/supabase';

interface InquiryDialogProps {
  supplierId: string;
  supplierName: string;
  eventId: string;
}

export function InquiryDialog({
  supplierId,
  supplierName,
  eventId,
}: InquiryDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!message.trim()) {
      setError('Please write a message.');
      return;
    }
    setSending(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be signed in to send an inquiry.');
      setSending(false);
      return;
    }

    const { error: insertError } = await supabase.from('inquiries').insert({
      event_id: eventId,
      supplier_id: supplierId,
      user_id: user.id,
      message: message.trim(),
      status: 'pending',
    });

    setSending(false);

    if (insertError) {
      setError('Failed to send inquiry. Please try again.');
      return;
    }

    setSent(true);
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setMessage('');
      setSent(false);
      setError('');
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          className="w-full py-2.5 rounded-lg text-xs font-medium border transition-colors"
          style={{
            background: 'transparent',
            borderColor: '#3a3530',
            color: '#9a8f86',
          }}
        >
          Send Inquiry
        </button>
      </Dialog.Trigger>

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
          <Dialog.Title
            className="font-serif text-xl"
            style={{ color: '#f0ebe3' }}
          >
            Inquire about {supplierName}
          </Dialog.Title>
          <Dialog.Description className="text-sm" style={{ color: '#6b6258' }}>
            Write a message to this supplier. Our team will forward it on your
            behalf.
          </Dialog.Description>

          {sent ? (
            <div
              className="rounded-xl border px-5 py-4 text-sm"
              style={{
                background: '#0f1a0f',
                borderColor: '#3a7a3a',
                color: '#7acc7a',
              }}
            >
              Inquiry sent! We'll be in touch shortly.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Your message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={`Hi, I'm interested in your ${supplierName} services for my upcoming event…`}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none"
                  style={{
                    background: '#0b0a09',
                    borderColor: '#2a2520',
                    color: '#f0ebe3',
                  }}
                />
              </div>
              {error && (
                <p className="text-xs" style={{ color: '#b5505a' }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full py-3 rounded-xl font-medium text-sm transition-opacity"
                style={{
                  background: '#c9975b',
                  color: '#0b0a09',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send inquiry'}
              </button>
            </div>
          )}

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
