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
  ShieldCheck,
  KeyRound,
  Save,
  Lock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

/**
 * Sicherheit — admin-only auth & access policy controls.
 * Reads/writes public.security_settings (one row per organization).
 * Roles permission matrix is informational (RLS lives in DB).
 */

type Sec = {
  require_2fa: boolean
  password_min_length: number
  password_require_upper: boolean
  password_require_digit: boolean
  password_require_special: boolean
  session_timeout_minutes: number
}

const defaultSec: Sec = {
  require_2fa: false,
  password_min_length: 10,
  password_require_upper: true,
  password_require_digit: true,
  password_require_special: false,
  session_timeout_minutes: 480,
}

const ROLES = [
  { key: 'admin', label: { de: 'Verwalter', en: 'Administrator' } },
  { key: 'dispatcher', label: { de: 'Disponent', en: 'Dispatcher' } },
  { key: 'employee', label: { de: 'Mitarbeiter', en: 'Employee' } },
] as const

type Capability = {
  key: string
  label: { de: string; en: string }
  admin: boolean
  dispatcher: boolean
  employee: boolean
}

const CAPABILITIES: Capability[] = [
  { key: 'view_plans',    label: { de: 'Einsatzpläne ansehen',         en: 'View plans' },              admin: true,  dispatcher: true,  employee: true  },
  { key: 'edit_plans',    label: { de: 'Einsatzpläne bearbeiten',      en: 'Edit plans' },              admin: true,  dispatcher: true,  employee: false },
  { key: 'manage_users',  label: { de: 'Benutzer verwalten',           en: 'Manage users' },            admin: true,  dispatcher: false, employee: false },
  { key: 'manage_org',    label: { de: 'Organisation verwalten',       en: 'Manage organization' },     admin: true,  dispatcher: false, employee: false },
  { key: 'view_reports',  label: { de: 'Berichte einsehen',            en: 'View reports' },            admin: true,  dispatcher: true,  employee: false },
  { key: 'export_times',  label: { de: 'Eigene Zeiten exportieren',    en: 'Export own time entries' }, admin: true,  dispatcher: true,  employee: true  },
  { key: 'delete_times',  label: { de: 'Zeiten löschen',               en: 'Delete time entries' },     admin: true,  dispatcher: true,  employee: false },
  { key: 'manage_settings', label: { de: 'Einstellungen verwalten',     en: 'Manage settings' },         admin: true,  dispatcher: false, employee: false },
]

export default function SecurityPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, isAdmin, isLoading } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sec, setSec] = useState<Sec>(defaultSec)
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/dashboard')
  }, [isLoading, isAdmin, router])

  useEffect(() => {
    if (!profile?.organization_id) return
    ;(async () => {
      const { data } = await supabase
        .from('security_settings')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()
      if (data) {
        setSec({
          require_2fa: data.require_2fa,
          password_min_length: data.password_min_length,
          password_require_upper: data.password_require_upper,
          password_require_digit: data.password_require_digit,
          password_require_special: data.password_require_special,
          session_timeout_minutes: data.session_timeout_minutes,
        })
      }
      setLoading(false)
    })()
  }, [profile?.organization_id, supabase])

  const setNum = (k: 'password_min_length' | 'session_timeout_minutes', v: number) =>
    setSec(p => ({ ...p, [k]: Math.max(0, Math.floor(v)) }))

  const toggle = (k: keyof Sec) => setSec(p => ({ ...p, [k]: !p[k] as any }))

  const handleSave = async () => {
    if (!profile?.organization_id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('security_settings')
        .upsert({
          organization_id: profile.organization_id,
          ...sec,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' })
      if (error) throw error
      toast.success(L('Sicherheits-Einstellungen gespeichert', 'Security settings saved'))
    } catch (err: any) {
      toast.error(err.message || L('Speichern fehlgeschlagen', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (pw.next !== pw.confirm) {
      toast.error(L('Passwörter stimmen nicht überein', 'Passwords do not match'))
      return
    }
    if (pw.next.length < sec.password_min_length) {
      toast.error(L(
        `Mindestens ${sec.password_min_length} Zeichen erforderlich`,
        `At least ${sec.password_min_length} characters required`
      ))
      return
    }
    setSavingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.next })
      if (error) throw error
      setPw({ next: '', confirm: '' })
      toast.success(L('Passwort aktualisiert', 'Password updated'))
    } catch (err: any) {
      toast.error(err.message || L('Aktualisierung fehlgeschlagen', 'Update failed'))
    } finally {
      setSavingPw(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-4"
      >
        <ChevronLeft className="w-3 h-3" /> {L('Einstellungen', 'Settings')}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#0064E0] leading-tight">
            {L('Sicherheit', 'Security')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {L('Zugriffskontrolle und Authentifizierungsrichtlinien.', 'Access control and authentication policies.')}
          </p>
        </div>
      </div>

      {/* Auth policy */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 md:px-8 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{L('Authentifizierung', 'Authentication')}</h2>
        </div>

        <Row label={L('Zwei-Faktor-Authentifizierung erzwingen', 'Require two-factor authentication')}>
          <Toggle on={sec.require_2fa} onChange={() => toggle('require_2fa')} />
        </Row>

        <Row label={L('Mindestlänge Passwort', 'Minimum password length')}>
          <input
            type="number"
            min={6}
            max={64}
            value={sec.password_min_length}
            onChange={e => setNum('password_min_length', Number(e.target.value))}
            className="w-24 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </Row>

        <Row label={L('Großbuchstaben erforderlich', 'Require uppercase letters')}>
          <Toggle on={sec.password_require_upper} onChange={() => toggle('password_require_upper')} />
        </Row>

        <Row label={L('Ziffern erforderlich', 'Require digits')}>
          <Toggle on={sec.password_require_digit} onChange={() => toggle('password_require_digit')} />
        </Row>

        <Row label={L('Sonderzeichen erforderlich', 'Require special characters')}>
          <Toggle on={sec.password_require_special} onChange={() => toggle('password_require_special')} />
        </Row>

        <Row
          label={L('Sitzungs-Timeout (Minuten)', 'Session timeout (minutes)')}
          last
        >
          <input
            type="number"
            min={15}
            value={sec.session_timeout_minutes}
            onChange={e => setNum('session_timeout_minutes', Number(e.target.value))}
            className="w-24 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </Row>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <KeyRound className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">{L('Eigenes Passwort ändern', 'Change your password')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {L('Neues Passwort', 'New password')}
            </label>
            <input
              type="password"
              value={pw.next}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {L('Bestätigen', 'Confirm')}
            </label>
            <input
              type="password"
              value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={savingPw || !pw.next || !pw.confirm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-60"
        >
          {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {L('Passwort ändern', 'Change password')}
        </button>
      </div>

      {/* Roles matrix (read-only) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 md:px-8 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{L('Rollen & Berechtigungen', 'Roles & permissions')}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {L(
              'Standardberechtigungen je Rolle. Auf DB-Ebene per Row-Level Security erzwungen.',
              'Default permissions per role. Enforced at the database level via Row-Level Security.'
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-6 md:px-8 py-3">{L('Berechtigung', 'Capability')}</th>
                {ROLES.map(r => (
                  <th key={r.key} className="px-4 py-3 text-center">{L(r.label.de, r.label.en)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map(cap => (
                <tr key={cap.key} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 md:px-8 py-3 font-medium text-slate-700">{L(cap.label.de, cap.label.en)}</td>
                  {ROLES.map(r => (
                    <td key={r.key} className="px-4 py-3 text-center">
                      {(cap as any)[r.key] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                      ) : (
                        <span className="inline-block w-4 h-px bg-slate-200" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 md:px-8 py-4 bg-amber-50/40 border-t border-slate-100 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{L(
            'Custom-Rollen können in einer kommenden Version hinzugefügt werden.',
            'Custom roles can be added in a future release.'
          )}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {L('Einstellungen speichern', 'Save settings')}
        </button>
      </div>
    </div>
  )
}

function Row({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-6 md:px-8 py-4 ${last ? '' : 'border-b border-slate-50'}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}
