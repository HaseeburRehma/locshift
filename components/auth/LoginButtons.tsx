'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

interface LoginButtonsProps {
  onLoginClick: () => void
}

export default function LoginButtons({ onLoginClick }: LoginButtonsProps) {
  const { locale } = useTranslation()
  // Inline strings (not going through t()) so no cache / hydration bug can
  // ever produce the "both buttons say Register" case again. Keys used to
  // resolve to the same string on some stale deployments.
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm px-6">
      <button
        onClick={onLoginClick}
        className="w-full h-14 bg-white text-[#0064E0] border-2 border-white rounded-[12px] font-semibold text-lg hover:bg-gray-100 transition-all shadow-sm active:scale-95"
      >
        {L('Anmelden', 'Login')}
      </button>

      <Link href="/register" className="w-full">
        <button className="w-full h-14 bg-transparent text-white border-2 border-white rounded-[12px] font-semibold text-lg hover:bg-white/10 transition-all active:scale-95">
          {L('Registrieren', 'Register')}
        </button>
      </Link>

      <div className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="text-white/90 hover:text-white text-sm font-medium transition-colors"
        >
          {L('Passwort vergessen?', 'Forgot Password?')}
        </Link>
      </div>
    </div>
  )
}
