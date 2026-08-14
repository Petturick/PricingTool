import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'PrySight | Pricing Intelligence',
    template: '%s | PrySight',
  },
  description: 'PrySight geeft grip op concurrentieprijzen, marktpositie, prijsbewegingen en marge-kansen.',
  applicationName: 'PrySight',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: 'any' }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
