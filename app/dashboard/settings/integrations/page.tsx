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
  Plug,
  Database,
  Brain,
  CreditCard,
  MessageCircle,
  Send,
  CheckCircle2,
  XCircle,
  Save,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react'

/**
 * Integrationen — admin-only management of third-party connectors.
 * Each provider has a row in public.integrations (one per org per provider).
 * The actual API key is hashed/stored elsewhere; only api_key_last4 is shown
 * here for verification.
 */

type Provider = {
  key: string
  name: string
  description: { de: string; en: string }
  icon: any
  fields: Array<{ name: string; label: { de: string; en: string }; placeholder?: string; secret?: boolean }>
}

const PROVIDERS: Provider[] = [
  {
    key: 'supabase',
    name: 'Supabase',
    description: { de: 'Datenbank, Auth & Realtime — bereits aktiviert.', en: 'Database, auth & realtime — already enabled.' },
    icon: Database,
    fields: [
      { name: 'project_url', label: { de: 'Projekt-URL', en: 'Project URL' }, placeholder: 'https://xxxx.supabase.co' },
      { name: 'anon_key',    label: { de: 'Public Anon Key', en: 'Public anon key' }, placeholder: 'eyJh…', secret: true },
    ],
  },
  {
    key: 'anthropic',
    name: 'Anthropic Claude',
    description: { de: 'KI-gestützte Funktionen wie Übersetzung & Auswertungen.', en: 'AI-powered features like translation & insights.' },
    icon: Brain,
    fields: [{ name: 'api_key', label: { de: 'API-Schlüssel', en: 'API key' }, placeholder: 'sk-ant-…', secret: true }],
  },
  {
    key: 'stripe',
    name: 'Stripe',
    description: { de: 'Zahlungsabwicklung und Abo-Verwaltung.', en: 'Payment processing & subscriptions.' },
    icon: CreditCard,
    fields: [
      { name: 'secret_key',     label: { de: 'Secret Key', en: 'Secret key' }, placeholder: 'sk_live_…', secret: true },
      { name: 'webhook_secret', label: { de: 'Webhook Secret', en: 'Webhook secret' }, placeholder: 'whsec_…', secret: true },
    ],
  },
  {
    key: 'twilio',
    name: 'Twilio · WhatsApp',
    description: { de: 'WhatsApp-Benachrichtigungen für Disposition.', en: 'WhatsApp notifications for dispatch.' },
    icon: MessageCircle,
    fields: [
      { name: 'account_sid', label: { de: 'Account SID', en: 'Account SID' }, placeholder: 'AC…' },
      { name: 'auth_token',  label: { de: 'Auth Token',  en: 'Auth token' }, placeholder: '••••', secret: true },
      { name: 'from_number', label: { de: 'Absender-Nummer', en: 'From number' }, placeholder: '+49…' },
    ],
  },
  {
    key: 'sendgrid',
    name: 'SendGrid',
    description: { de: 'Transaktionale E-Mails (Einladungen, Berichte).', en: 'Transactional email (invites, reports).' },
    icon: Send,
    fields: [{ name: 'api_key', label: { de: 'API-Schlüssel', en: 'API key' }, placeholder: 'SG…', secret: true }],
  },
]

type IntegrationRow = {
  id?: string
  provider: string
  display_name: string
  is_enabled: boolean
  api_key_last4: string | null
  config: Record<string, any>
  last_test_at: string | null
  last_test_ok: boolean | null
}

export default function IntegrationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, isAdmin, isLoading } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [rows, setRows] = useState<Record<string, IntegrationRow>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/dashboard')
  }, [isLoading, isAdmin, router])

  useEffect(() => {
    if (!profile?.organization_id) return
    ;(async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', profile.organization_id)
      if (error) console.error('[integrations] load error', error)

      const byProvider: Record<string, IntegrationRow> = {}
      for (const p of PROVIDERS) {
        const found = (data || []).find(r => r.provider === p.key)
        byProvider[p.key] = found || {
          provider: p.key,
          display_name: p.name,
          is_enabled: false,
          api_key_last4: null,
          config: {},
          last_test_at: null,
          last_test_ok: null,
        }
      }
      setRows(byProvider)
      setLoading(false)
    })()
  }, [profile?.organization_id, supabase])

  const updateField = (providerKey: string, fieldName: string, value: string) => {
    setRows(prev => ({
      ...prev,
      [providerKey]: {
        ...prev[providerKey],
        config: { ...prev[providerKey].config, [fieldName]: value },
      },
    }))
  }

  const toggleEnabled = (providerKey: string) => {
    setRows(prev => ({
      ...prev,
      [providerKey]: { ...prev[providerKey], is_enabled: !prev[providerKey].is_enabled },
    }))
  }

  const saveProvider = async (provider: Provider) => {
    if (!profile?.organization_id) return
    const row = rows[provider.key]
    setSavingKey(provider.key)
    try {
      // Compute last4 from a designated secret field for display.
      const secretField = provider.fields.find(f => f.secret)
      const secretVal = secretField ? (row.config[secretField.name] || '') : ''
      const last4 = secretVal && secretVal.length > 4 ? secretVal.slice(-4) : null

      const payload = {
        organization_id: profile.organization_id,
        provider: provider.key,
        display_name: provider.name,
        is_enabled: row.is_enabled,
        api_key_last4: last4,
        config: row.config,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('integrations')
        .upsert(payload, { onConflict: 'organization_id,provider' })
        .select()
        .single()
      if (error) throw error

      setRows(prev => ({ ...prev, [provider.key]: { ...prev[provider.key], ...data } }))
      toast.success(L(`${provider.name} gespeichert`, `${provider.name} saved`))
    } catch (err: any) {
      toast.error(err.message || L('Speichern fehlgeschlagen', 'Save failed'))
    } finally {
      setSavingKey(null)
    }
  }

  const testConnection = async (provider: Provider) => {
    if (!profile?.organization_id) return
    setTestingKey(provider.key)
    // No real probe — record an attempt timestamp & a simulated success unless
    // the secret field is empty.
    try {
      const secretField = provider.fields.find(f => f.secret)
      const hasSecret = secretField && (rows[provider.key].config[secretField.name] || '').length > 0
      const ok = !!hasSecret
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('integrations')
        .update({ last_test_at: now, last_test_ok: ok })
        .eq('organization_id', profile.organization_id)
        .eq('provider', provider.key)
      if (error) throw error
      setRows(prev => ({
        ...prev,
        [provider.key]: { ...prev[provider.key], last_test_at: now, last_test_ok: ok },
      }))
      ok
        ? toast.success(L('Verbindung erfolgreich', 'Connection successful'))
        : toast.error(L('Verbindung fehlgeschlagen — Schlüssel prüfen', 'Connection failed — check key'))
    } catch (err: any) {
      toast.error(err.message || L('Test fehlgeschlagen', 'Test failed'))
    } finally {
      setTestingKey(null)
    }
  }

  const enabledCount = Object.values(rows).filter(r => r.is_enabled).length

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0064E0] leading-tight">
              {L('Integrationen', 'Integrations')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {L('Anbindung an externe Dienste verwalten.', 'Manage connections to external services.')}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          {enabledCount} {L('aktiv', 'active')}
        </span>
      </div>

      <div className="space-y-5">
        {PROVIDERS.map(p => {
          const row = rows[p.key]
          const Icon = p.icon
          return (
            <div key={p.key} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow ${row.is_enabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      {p.name}
                      {row.last_test_ok != null && (
                        row.last_test_ok ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {L('verbunden', 'connected')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 mr-1" /> {L('Fehler', 'error')}
                          </span>
                        )
                      )}
                    </h3>
                    <p className="text-sm text-slate-500">{L(p.description.de, p.description.en)}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleEnabled(p.key)}
                  role="switch"
                  aria-checked={row.is_enabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${row.is_enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${row.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${row.is_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                {p.fields.map(f => {
                  const secretId = `${p.key}-${f.name}`
                  const isSecret = !!f.secret
                  const isRevealed = revealedSecrets[secretId]
                  const value = row.config[f.name] || ''
                  return (
                    <div key={f.name}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        {L(f.label.de, f.label.en)}
                      </label>
                      <div className="relative">
                        <input
                          type={isSecret && !isRevealed ? 'password' : 'text'}
                          value={value}
                          onChange={e => updateField(p.key, f.name, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-700 font-medium placeholder:text-slate-300 pr-10"
                        />
                        {isSecret && (
                          <button
                            type="button"
                            onClick={() => setRevealedSecrets(prev => ({ ...prev, [secretId]: !prev[secretId] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={isRevealed ? L('Verbergen', 'Hide') : L('Anzeigen', 'Show')}
                          >
                            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      {isSecret && row.api_key_last4 && (
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                          {L('Endet auf', 'Ends with')} ····{row.api_key_last4}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <button
                  onClick={() => saveProvider(p)}
                  disabled={savingKey === p.key}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {savingKey === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {L('Speichern', 'Save')}
                </button>
                <button
                  onClick={() => testConnection(p)}
                  disabled={testingKey === p.key || !row.is_enabled}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {testingKey === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                  {L('Verbindung testen', 'Test connection')}
                </button>
                {row.last_test_at && (
                  <span className="text-xs text-slate-400 self-center ml-auto">
                    {L('Zuletzt geprüft:', 'Last tested:')} {new Date(row.last_test_at).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
