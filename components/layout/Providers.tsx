'use client'

import React from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/auth-context'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1A1A24',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          },
        }}
      />
    </AuthProvider>
  )
}
