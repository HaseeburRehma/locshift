'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Loader2,
  Globe,
  Save,
  Check,
} from 'lucide-react'

/**
 * Lokalisierung — language, timezone, currency, date/time format.
 * Per-user UI locale persists via useTranslation().setLocale (localStorage)
 * Per-org defaults persist on public.organizations (admin only).
 */

const TIMEZONES = [
  'Europe/Berlin',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'UTC',
]

const CURRENCIES = ['EUR', 'CHF', 'USD', 'GBP']

const DATE_FORMATS = [
  { id: 'DD.MM.YYYY', sample: '28.04.2026' },
  { id: 'YYYY-MM-DD', sample: '2026-04-28' },
  { id: 'MM/DD/YYYY', sample: '04/28/2026' },
]

const LANGUAGES: Array<{ code: 'de' | 'en'; name: { de: string; en: string }; flag: string }> = [
  { code: 'de', name: { de: 'Deutsch', en: 'German' },  flag: '🇩🇪' },
  { code: 'en', name: { de: 'Englisch', en: 'English' }, flag: '🇬🇧' },
]

export default function LocalizationPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, isAdmin } = useUser()
  const { locale, setLocale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgDefaults, setOrgDefaults] = useState({
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    default_locale: 'de' as 'de' | 'en',
    date_format: 'DD.MM.YYYY',
    time_format: '24h',
  })

  useEffect(() => {
    if (!profile?.organization_id) return
    ;(async () => {
      const { data } = await supabase
        .from('organizations')
        .select('timezone, currency, default_locale, date_format, time_format')
        .eq('id', profile.organization_id)
        .single()
      if (data) {
        setOrgDefaults({
          timezone: data.timezone || 'Europe/Berlin',
          currency: data.currency || 'EUR',
          default_locale: (data.default_locale === 'en' ? 'en' : 'de'),
          date_format: data.date_format || 'DD.MM.YYYY',
          time_format: data.time_format || '24h',
        })
      }
      setLoading(false)
    })()
  }, [profile?.organization_id, supabase])

  const handleSave = async () => {
    if (!profile?.organization_id) return
    if (!isAdmin) {
      toast.error(L('Nur Administratoren können Standards ändern', 'Only admins can change defaults'))
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          timezone: orgDefaults.timezone,
          currency: orgDefaults.currency,
          default_locale: orgDefaults.default_locale,
          date_format: orgDefaults.date_format,
          time_format: orgDefaults.time_format,
        })
        .eq('id', profile.organization_id)
      if (error) throw error
      toast.success(L('Standards gespeichert', 'Defaults saved'))
    } catch (err: any) {
      toast.error(err.message || L('Speichern fehlgeschlagen', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-4"
      >
        <ChevronLeft className="w-3 h-3" /> {L('Einstellungen', 'Settings')}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shadow-lg">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#0064E0] leading-tight">
            {L('Lokalisierung', 'Localization')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {L('Sprache, Zeitzone, Währung und Datumsformat.', 'Language, timezone, currency and date format.')}
          </p>
        </div>
      </div>

      {/* Personal language preference (per-user, instant) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 mb-6">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          {L('Meine Sprache', 'My language')}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {L('Wirkt sich sofort auf Ihre eigene Oberfläche aus.', 'Takes effect instantly on your own UI.')}
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {LANGUAGES.map(lang => {
            const active = locale === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => setLocale(lang.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                  active ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-bold text-slate-800">{L(lang.name.de, lang.name.en)}</span>
                  <span className="block text-[10px] uppercase tracking-widest text-slate-400">{lang.code}</span>
                </span>
                {active && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Organization defaults — admin only */}
      <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 ${isAdmin ? '' : 'opacity-70'}`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-base font-bold text-slate-900">
            {L('Organisations-Standards', 'Organization defaults')}
          </h2>
          {!isAdmin && (
            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {L('Nur lesen', 'Read-only')}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-6">
          {L(
            'Diese Standards werden für neue Benutzer und systemweite Anzeige verwendet.',
            'These defaults apply to new users and system-wide display.'
          )}
        </p>

        <fieldset disabled={!isAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label={L('Standard-Sprache', 'Default language')}>
            <select
              value={orgDefaults.default_locale}
              onChange={e => setOrgDefaults(p => ({ ...p, default_locale: e.target.value as 'de' | 'en' }))}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
            >
              <option value="de">Deutsch (DE)</option>
              <option value="en">English (EN)</option>
            </select>
          </Field>

          <Field label={L('Zeitzone', 'Timezone')}>
            <select
              value={orgDefaults.timezone}
              onChange={e => setOrgDefaults(p => ({ ...p, timezone: e.target.value }))}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>

          <Field label={L('Währung', 'Currency')}>
            <select
              value={orgDefaults.currency}
              onChange={e => setOrgDefaults(p => ({ ...p, currency: e.target.value }))}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label={L('Zeitformat', 'Time format')}>
            <select
              value={orgDefaults.time_format}
              onChange={e => setOrgDefaults(p => ({ ...p, time_format: e.target.value }))}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
            >
              <option value="24h">24h (14:30)</option>
              <option value="12h">12h (2:30 PM)</option>
            </select>
          </Field>

          <Field label={L('Datumsformat', 'Date format')} className="md:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              {DATE_FORMATS.map(df => {
                const active = orgDefaults.date_format === df.id
                return (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => setOrgDefaults(p => ({ ...p, date_format: df.id }))}
                    disabled={!isAdmin}
                    className={`px-3 py-2 rounded-xl border-2 text-left text-sm transition-all ${
                      active ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                    } disabled:cursor-not-allowed`}
                  >
                    <span className="block font-bold text-slate-800">{df.id}</span>
                    <span className="block text-xs text-slate-500">{df.sample}</span>
                  </button>
                )
              })}
            </div>
          </Field>
        </fieldset>

        {isAdmin && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {L('Standards speichern', 'Save defaults')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
