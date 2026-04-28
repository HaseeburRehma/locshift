'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Loader2,
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Save,
  TestTube,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react'
import { sendNotification } from '@/lib/notifications/service'

/**
 * Benachrichtigungen — per-user channel + per-event toggles plus quiet hours.
 * Persists to public.notification_preferences (created in 20260428100000).
 * Each user manages their own row (RLS: own row read+write).
 */

type Prefs = {
  email_enabled: boolean
  whatsapp_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  event_new_shift: boolean
  event_shift_updated: boolean
  event_plan_confirmed: boolean
  event_plan_rejected: boolean
  event_calendar_invite: boolean
  event_calendar_reminder: boolean
  event_time_approval: boolean
  event_chat_mention: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

const defaultPrefs: Prefs = {
  email_enabled: true,
  whatsapp_enabled: false,
  push_enabled: true,
  in_app_enabled: true,
  event_new_shift: true,
  event_shift_updated: true,
  event_plan_confirmed: true,
  event_plan_rejected: true,
  event_calendar_invite: true,
  event_calendar_reminder: true,
  event_time_approval: true,
  event_chat_mention: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
}

export default function NotificationSettingsPage() {
  const supabase = createClient()
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()
      if (data) {
        setPrefs({
          email_enabled: data.email_enabled,
          whatsapp_enabled: data.whatsapp_enabled,
          push_enabled: data.push_enabled,
          in_app_enabled: data.in_app_enabled,
          event_new_shift: data.event_new_shift,
          event_shift_updated: data.event_shift_updated,
          event_plan_confirmed: data.event_plan_confirmed,
          event_plan_rejected: data.event_plan_rejected,
          event_calendar_invite: data.event_calendar_invite,
          event_calendar_reminder: data.event_calendar_reminder,
          event_time_approval: data.event_time_approval,
          event_chat_mention: data.event_chat_mention,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
        })
      }
      setLoading(false)
    })()
  }, [profile, supabase])

  const toggle = (k: keyof Prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }))
  const setQuiet = (k: 'quiet_hours_start' | 'quiet_hours_end', v: string) =>
    setPrefs(p => ({ ...p, [k]: v || null }))

  const handleSave = async () => {
    if (!profile?.organization_id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: profile.id,
          organization_id: profile.organization_id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (error) throw error
      toast.success(L('Einstellungen gespeichert', 'Preferences saved'))
    } catch (err: any) {
      toast.error(err.message || L('Speichern fehlgeschlagen', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!profile) return
    setTesting(true)
    try {
      await sendNotification({
        userId: profile.id,
        title: L('🔔 Test-Benachrichtigung', '🔔 Test notification'),
        message: L(
          'Ihre Benachrichtigungseinstellungen funktionieren.',
          'Your notification preferences are working.'
        ),
        module: 'system',
      })
      toast.success(L('Test-Benachrichtigung gesendet', 'Test notification sent'))
    } catch (err: any) {
      toast.error(err.message || L('Senden fehlgeschlagen', 'Send failed'))
    } finally {
      setTesting(false)
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0064E0] leading-tight">
              {L('Benachrichtigungen', 'Notifications')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {L('E-Mail, WhatsApp und In-App-Benachrichtigungen verwalten.', 'Manage email, WhatsApp and in-app notifications.')}
            </p>
          </div>
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {L('Test senden', 'Send test')}
        </button>
      </div>

      {/* Channels */}
      <Card title={L('Kanäle', 'Channels')} description={L('Wo möchten Sie Benachrichtigungen empfangen?', 'Where do you want to receive notifications?')}>
        <ToggleRow
          icon={Mail}
          label={L('E-Mail', 'Email')}
          desc={L('Wichtige Updates per E-Mail.', 'Important updates by email.')}
          on={prefs.email_enabled}
          onChange={() => toggle('email_enabled')}
        />
        <ToggleRow
          icon={MessageCircle}
          label="WhatsApp"
          desc={L('Schnelle Nachrichten via WhatsApp (Twilio erforderlich).', 'Quick messages via WhatsApp (requires Twilio).')}
          on={prefs.whatsapp_enabled}
          onChange={() => toggle('whatsapp_enabled')}
        />
        <ToggleRow
          icon={Smartphone}
          label={L('Mobile Push', 'Mobile push')}
          desc={L('Push-Benachrichtigungen auf Ihrem Gerät.', 'Push notifications on your device.')}
          on={prefs.push_enabled}
          onChange={() => toggle('push_enabled')}
        />
        <ToggleRow
          icon={Bell}
          label={L('In der App', 'In-app')}
          desc={L('Anzeige in der Glocke oben rechts.', 'Shown in the bell at top right.')}
          on={prefs.in_app_enabled}
          onChange={() => toggle('in_app_enabled')}
          last
        />
      </Card>

      {/* Events */}
      <Card title={L('Ereignisse', 'Events')} description={L('Wofür sollen Benachrichtigungen versendet werden?', 'Which events should trigger a notification?')} className="mt-6">
        <ToggleRow
          icon={FileText}
          label={L('Neue Schicht zugewiesen', 'New shift assigned')}
          on={prefs.event_new_shift}
          onChange={() => toggle('event_new_shift')}
        />
        <ToggleRow
          icon={FileText}
          label={L('Schicht aktualisiert', 'Shift updated')}
          on={prefs.event_shift_updated}
          onChange={() => toggle('event_shift_updated')}
        />
        <ToggleRow
          icon={CheckCircle2}
          label={L('Einsatzplan bestätigt', 'Plan confirmed')}
          on={prefs.event_plan_confirmed}
          onChange={() => toggle('event_plan_confirmed')}
        />
        <ToggleRow
          icon={XCircle}
          label={L('Einsatzplan abgelehnt', 'Plan rejected')}
          on={prefs.event_plan_rejected}
          onChange={() => toggle('event_plan_rejected')}
        />
        <ToggleRow
          icon={Calendar}
          label={L('Termineinladung', 'Calendar invite')}
          on={prefs.event_calendar_invite}
          onChange={() => toggle('event_calendar_invite')}
        />
        <ToggleRow
          icon={Calendar}
          label={L('Termin-Erinnerung', 'Calendar reminder')}
          on={prefs.event_calendar_reminder}
          onChange={() => toggle('event_calendar_reminder')}
        />
        <ToggleRow
          icon={CheckCircle2}
          label={L('Zeit-Freigabe nötig', 'Time approval needed')}
          on={prefs.event_time_approval}
          onChange={() => toggle('event_time_approval')}
        />
        <ToggleRow
          icon={MessageSquare}
          label={L('Chat-Erwähnung', 'Chat mention')}
          on={prefs.event_chat_mention}
          onChange={() => toggle('event_chat_mention')}
          last
        />
      </Card>

      {/* Quiet hours */}
      <Card title={L('Ruhezeiten', 'Quiet hours')} description={L('Innerhalb dieser Zeiten werden keine Push/WhatsApp-Benachrichtigungen gesendet.', 'No push/WhatsApp notifications during these hours.')} className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {L('Beginn', 'Start')}
            </label>
            <input
              type="time"
              value={prefs.quiet_hours_start ?? ''}
              onChange={e => setQuiet('quiet_hours_start', e.target.value)}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {L('Ende', 'End')}
            </label>
            <input
              type="time"
              value={prefs.quiet_hours_end ?? ''}
              onChange={e => setQuiet('quiet_hours_end', e.target.value)}
              className="w-full text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </Card>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {L('Einstellungen speichern', 'Save preferences')}
        </button>
      </div>
    </div>
  )
}

function Card({
  title,
  description,
  children,
  className = '',
}: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      <div className="p-6 md:p-7 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  on,
  onChange,
  last = false,
}: { icon: any; label: string; desc?: string; on: boolean; onChange: () => void; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-6 py-4 ${last ? '' : 'border-b border-slate-50'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={on}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
