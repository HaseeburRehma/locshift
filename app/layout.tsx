import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/lib/user-context'
import { I18nProvider } from '@/lib/i18n'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'LokShift – Operational Excellence & Workforce Management',
  description: 'LokShift streamlines shift planning, time tracking, and operational workflows for modern enterprises.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/logo-3.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/logo-3.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/logo-3.png',
        type: 'image/png',
      },
    ],
    apple: '/logo-3.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="font-sans antialiased" suppressHydrationWarning>
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
