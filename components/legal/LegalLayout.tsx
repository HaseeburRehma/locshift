import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

interface LegalLayoutProps {
  title: string
  subtitle?: string
  lastUpdated?: string
  children: React.ReactNode
  otherLocaleHref?: string
  otherLocaleLabel?: string
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  children,
  otherLocaleHref,
  otherLocaleLabel,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-[#0064E0] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Zurück / Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-[#0064E0]">LokShift</span>
          </div>
          {otherLocaleHref ? (
            <Link
              href={otherLocaleHref}
              className="text-sm font-medium text-[#0064E0] hover:underline"
            >
              {otherLocaleLabel}
            </Link>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-gray-500 text-lg mb-2">{subtitle}</p>
        ) : null}
        {lastUpdated ? (
          <p className="text-gray-400 text-sm mb-8">{lastUpdated}</p>
        ) : (
          <div className="mb-8" />
        )}

        <div className="prose prose-slate max-w-none legal-content">
          {children}
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p className="mb-2">
            <strong className="text-gray-700">Rhein Maas Rail GmbH</strong>
            <br />
            Josefstraße 157, 52080 Aachen, Deutschland
          </p>
          <p>
            E-Mail:{' '}
            <a
              href="mailto:lokshiftapp@gmail.com"
              className="text-[#0064E0] hover:underline"
            >
              lokshiftapp@gmail.com
            </a>
            {' · '}
            <Link href="/impressum" className="text-[#0064E0] hover:underline">
              Impressum
            </Link>
            {' · '}
            <Link href="/datenschutz" className="text-[#0064E0] hover:underline">
              Datenschutz
            </Link>
            {' · '}
            <Link href="/agb" className="text-[#0064E0] hover:underline">
              AGB
            </Link>
          </p>
        </footer>
      </main>

      <style>{`
        .legal-content section {
          margin-top: 2rem;
        }
        .legal-content h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #111827;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .legal-content p,
        .legal-content li {
          color: #374151;
          line-height: 1.7;
          font-size: 15px;
        }
        .legal-content ul {
          margin: 0.5rem 0 1rem 1.25rem;
          list-style: disc;
        }
        .legal-content li {
          margin-bottom: 0.25rem;
        }
        .legal-content a {
          color: #0064E0;
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
