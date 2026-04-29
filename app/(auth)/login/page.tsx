'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import LoginButtons from '@/components/auth/LoginButtons'
import { Globe, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const { t, locale, setLocale } = useTranslation()
  // Inline DE/EN switch — every visible string flips with the global locale
  // so the language toggle in the top-right works on this page too.
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggleLanguage = () => {
    setLocale(locale === 'de' ? 'en' : 'de')
    setShowLanguageMenu(false)
  }

  const handleLoginTrigger = () => {
    setShowForm(true)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    const supabase = createClient()
    try {
      console.log('[Login] Attempting sign-in for:', email)
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('[Login] Auth error:', error)
        throw error
      }

      if (!data.user) throw new Error('No user found after login')
      console.log('[Login] Success! User ID:', data.user.id)

      // Increased delay to ensure cookies are fully committed in dev environments
      await new Promise(r => setTimeout(r, 1000))
      
      const seen = typeof window !== 'undefined' ? localStorage.getItem('onboarding_completed') : 'false'
      
      // Use window.location.replace for a clean full-page transition.
      // This ensures the middleware correctly picks up the new session.
      const target = seen === 'true' ? '/dashboard' : '/onboarding'
      console.log('[Login] Redirecting to:', target)
      window.location.replace(target)
      
    } catch (err: any) {
      console.error('[Login] Caught error:', err)
      toast.error(err.message || L('Ungültige Zugangsdaten', 'Invalid credentials'))
    } finally {
      // ALWAYS reset loading state if we haven't redirected yet
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-[85vh] py-12 px-6">
      <div className="w-full max-w-sm flex justify-between items-center px-6">
        <div className="relative w-32 h-8">
          <Image src="/logo-1.png" alt="LokShift" fill className="object-contain" priority />
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <Globe size={24} />
          </button>
          
          {showLanguageMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={toggleLanguage}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                {locale === 'de' ? 'English' : 'Deutsch'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!showForm ? (
        <div className="flex-1 w-full flex flex-col items-center pt-8">
          <div className="flex-1 flex flex-col items-center justify-center space-y-12">
            <div className="relative w-64 h-64 animate-in fade-in zoom-in duration-700">
              <Image src="/splash.png" alt="Welcome" fill className="object-contain" priority />
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-white px-4 leading-tight">
                {t('auth.welcome')}
              </h1>
            </div>
          </div>

          <LoginButtons onLoginClick={handleLoginTrigger} />

          <div className="mt-8 text-center space-y-4 pb-8">
            <p className="text-[10px] text-white/60 max-w-[280px] mx-auto leading-tight">
              {locale === 'de' ? (
                <>Mit der Registrierung stimmen Sie unserem <span className="underline cursor-pointer">Datenschutzhinweis</span> &amp; unserer <span className="underline cursor-pointer">Datenschutzerklärung</span> zu</>
              ) : (
                <>By signing up, you agree to the <span className="underline cursor-pointer">Privacy Notice</span> &amp; <span className="underline cursor-pointer">Privacy Policy</span></>
              )}
            </p>
            <button className="text-xs text-white/80 hover:text-white font-medium transition-colors">
              {L('Probleme bei der Anmeldung?', 'Problems signing in?')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full max-w-sm flex flex-col pt-12 animate-in slide-in-from-right duration-300">
          <div className="text-left w-full mb-8">
            <h1 className="text-[26px] font-bold text-white mb-2 leading-tight">
              {L('Anmeldung fortsetzen', 'Continue signing in')}
            </h1>
            <p className="text-white/80 text-[14px]">
              {L(
                'Bitte geben Sie Ihre Zugangsdaten ein, um sich anzumelden.',
                'Please enter your details to sign in into your account'
              )}
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5 w-full">
            <div className="space-y-1.5 w-full">
              <label className="text-[13px] font-medium text-white ml-1">
                {L('E-Mail', 'Email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={L('E-Mail eingeben', 'Enter your email')}
                className="w-full h-14 px-4 bg-white border-none rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 transition-all outline-none"
                required
              />
            </div>

            <div className="space-y-1.5 w-full">
              <label className="text-[13px] font-medium text-white ml-1">
                {L('Passwort', 'Password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={L('Passwort eingeben', 'Enter your password')}
                  className="w-full h-14 pl-4 pr-12 bg-white border-none rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? L('Passwort verbergen', 'Hide password') : L('Passwort anzeigen', 'Show password')}
                >
                  {showPassword ? (
                    <EyeOff size={20} className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <Eye size={20} className="w-5 h-5 flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-6 bg-white text-[#0064E0] rounded-xl font-bold text-[16px] hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? L('Anmeldung läuft…', 'Signing in…') : L('Anmelden', 'Sign in')}
            </button>
          </form>

          <button
            onClick={() => setShowForm(false)}
            className="mt-8 text-white/80 hover:text-white font-medium text-sm transition-colors"
          >
            {L('← Zurück', '← Back')}
          </button>
        </div>
      )}
    </div>
  )
}
