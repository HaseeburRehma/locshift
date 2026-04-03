import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/lib/user-context'
import { I18nProvider } from '@/lib/i18n'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'LokShift – Operational Excellence & Workforce Management',
  description: 'LokShift streamlines shift planning, time tracking, and operational workflows for modern enterprises.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/Fav-Icon Dark.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/Fav-Icon Dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/Fav-Icon Dark.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/Fav-Icon Dark.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <UserProvider>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
