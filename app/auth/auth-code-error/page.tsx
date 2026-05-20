'use client'

/**
 * Friendly landing page for failed magic-link exchanges.
 *
 * The Supabase reset/recovery email is single-use. If the user clicks the
 * link twice — or after the TTL expires — Supabase appends
 * `?error=access_denied&error_code=otp_expired&error_description=...` to
 * /auth/callback. The callback route forwards those params here so the UI
 * can show why the link failed and offer a clear next step.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export default function AuthCodeErrorPage() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const searchParams = useSearchParams()
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorDescription, setErrorDescription] = useState<string | null>(null)

  useEffect(() => {
    setErrorCode(searchParams.get('error_code'))
    setErrorDescription(searchParams.get('error_description'))
  }, [searchParams])

  const isExpired = errorCode === 'otp_expired'
  const headline = isExpired
    ? L('Dieser Link ist abgelaufen', 'This link has expired')
    : L('Anmeldung fehlgeschlagen', 'Sign-in failed')

  const body = isExpired
    ? L(
        'Der Bestätigungslink wurde bereits verwendet oder ist abgelaufen. Bitte fordern Sie einen neuen Link an.',
        'The verification link was already used or has expired. Please request a new one to continue.',
      )
    : (errorDescription ||
        L(
          'Wir konnten Ihre Anmeldung nicht abschließen. Bitte versuchen Sie es erneut.',
          "We couldn't complete sign-in. Please try again.",
        ))

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0064E0] px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 p-4 bg-orange-50 rounded-full w-fit">
          <AlertCircle className="w-12 h-12 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{headline}</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{body}</p>

        <div className="space-y-3">
          <Link href="/forgot-password" className="block">
            <button className="w-full h-12 bg-[#0064E0] text-white rounded-xl font-bold text-[15px] hover:bg-[#0050B3] transition-all active:scale-95 inline-flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {L('Neuen Link anfordern', 'Request a new link')}
            </button>
          </Link>
          <Link href="/login" className="block">
            <button className="w-full h-12 border border-gray-200 text-gray-700 rounded-xl font-semibold text-[15px] hover:bg-gray-50 transition-all inline-flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" />
              {L('Zurück zur Anmeldung', 'Back to sign-in')}
            </button>
          </Link>
        </div>

        {errorCode && (
          <p className="mt-6 text-[10px] text-gray-300 font-mono uppercase tracking-wider">
            {errorCode}
          </p>
        )}
      </div>
    </div>
  )
}
