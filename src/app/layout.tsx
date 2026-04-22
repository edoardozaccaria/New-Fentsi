import type { Metadata } from 'next';
import { DM_Serif_Display, Outfit } from 'next/font/google';
import './globals.css';

// --font-display → DM Serif Display (headings, large numbers)
const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

// --font-body → Outfit (all body copy, labels, UI text)
const outfit = Outfit({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fentsi — Il tuo wedding planner',
  description: 'Pianifica il tuo matrimonio con Fentsi.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${dmSerifDisplay.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
