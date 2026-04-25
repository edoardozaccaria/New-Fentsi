import type { Metadata } from 'next'
import React from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/layout/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fentsi — Your AI Event Planner',
  description:
    'Turn the chaos of spreadsheets and group chats into a perfect event plan. Answer 10 questions, Fentsi does the rest.',
  keywords: ['wedding planner', 'event planner', 'AI', 'wedding', 'event planning', 'party planner'],
  openGraph: {
    title: 'Fentsi — Your AI Event Planner',
    description: 'Plan your perfect event in 10 minutes with artificial intelligence.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#09090F] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
