'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'

export default function ChangePasswordPage() {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (password.length < 8) {
      toast.error(L('Passwort muss mindestens 8 Zeichen lang sein', 'Password must be at least 8 characters'))
      return
    }
    if (password !== confirm) {
      toast.error(L('Passwörter stimmen nicht überein', 'Passwords do not match'))
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user session')

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() } as any)
        .eq('id', user.id)

      if (profileError) throw profileError

      toast.success(L('Passwort erfolgreich geändert', 'Password updated'))
      window.location.replace('/dashboard')
    } catch (err: any) {
      toast.error(err?.message || L('Fehler beim Aktualisieren', 'Update failed'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0064E0] px-6">
      <div className="w-full max-w-sm">
        <div className="text-left mb-8">
          <h1 className="text-[26px] font-bold text-white mb-2 leading-tight">
            {L('Initiales Passwort ändern', 'Set your password')}
          </h1>
          <p className="text-white/80 text-[14px]">
            {L(
              'Aus Sicherheitsgründen müssen Sie Ihr initiales Passwort ändern, bevor Sie fortfahren.',
              'For security, you must change your initial password before continuing.',
            )}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white ml-1">
              {L('Neues Passwort', 'New password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={L('Mindestens 8 Zeichen', 'At least 8 characters')}
                className="w-full h-14 pl-4 pr-12 bg-white border-none rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 transition-all outline-none"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPassword ? L('Passwort verbergen', 'Hide password') : L('Passwort anzeigen', 'Show password')}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white ml-1">
              {L('Passwort bestätigen', 'Confirm password')}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={L('Passwort wiederholen', 'Repeat password')}
              className="w-full h-14 px-4 bg-white border-none rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 transition-all outline-none"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-6 bg-white text-[#0064E0] rounded-xl font-bold text-[16px] hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? L('Wird gespeichert…', 'Saving…') : L('Passwort speichern', 'Save password')}
          </button>
        </form>
      </div>
    </div>
  )
}
