'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, Calendar, FileText, Users, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

// No Zap/spark icons — replaced with module-appropriate glyphs so every row
// gets a meaningful icon and we never fall back to a "lightning bolt" that
// looks like noise in the panel.
const moduleIcons: Record<string, React.ReactNode> = {
  plans:        <FileText className="w-4 h-4 text-blue-600" />,
  calendar:     <Calendar className="w-4 h-4 text-purple-600" />,
  customers:    <Users    className="w-4 h-4 text-emerald-600" />,
  shifts:       <FileText className="w-4 h-4 text-amber-600" />,
  system:       <Bell     className="w-4 h-4 text-gray-500" />,
  new_lead:     <Users    className="w-4 h-4 text-blue-600" />,
  job_assigned: <FileText className="w-4 h-4 text-amber-600" />,
}

const moduleBg: Record<string, string> = {
  plans:     'bg-blue-50',
  calendar:  'bg-purple-50',
  customers: 'bg-emerald-50',
  shifts:    'bg-amber-50',
  system:    'bg-gray-50',
}

const moduleRoutes: Record<string, string> = {
  plans:     '/dashboard/plans',
  calendar:  '/dashboard/calendar',
  customers: '/dashboard/customers',
  shifts:    '/dashboard/times',
  system:    '/dashboard',
}

/**
 * Translate a stored notification title + body into the current UI locale.
 *
 * New notifications are inserted in German by every sendNotification()
 * caller, but the database may still contain *historic* notifications that
 * were created (in English) before the German-canonical sweep. To make the
 * panel feel consistent with the language toggle we flip in BOTH directions:
 *   - When the UI is in English, German rows are mapped → English.
 *   - When the UI is in German,  English rows are mapped → German.
 * Anything that doesn't match a known pattern is shown as-is.
 */
function translateNotification(title: string, body: string | null | undefined, locale: 'de' | 'en') {
  // ---------- EN → DE (old English rows shown when locale is DE) ----------
  if (locale === 'de') {
    const reverseTitleMap: Record<string, string> = {
      '🏢 New Customer Added': '🏢 Neuer Kunde angelegt',
      '🏢 New customer added': '🏢 Neuer Kunde angelegt',
      '✅ Plan Confirmed': '✅ Einsatzplan bestätigt',
      '✅ Plan confirmed': '✅ Einsatzplan bestätigt',
      '✅ Plan Confirmed by Employee': '✅ Einsatzplan vom Mitarbeiter bestätigt',
      '✅ Plan confirmed by employee': '✅ Einsatzplan vom Mitarbeiter bestätigt',
      '❌ Plan Rejected': '❌ Einsatzplan abgelehnt',
      '❌ Plan rejected': '❌ Einsatzplan abgelehnt',
      '📋 New Shift Assigned': '📋 Neue Schicht zugewiesen',
      '📋 New shift assigned': '📋 Neue Schicht zugewiesen',
      '📋 Shift Updated': '📋 Schicht aktualisiert',
      '📋 Shift updated': '📋 Schicht aktualisiert',
      '📅 Event Created Successfully': '📅 Termin erfolgreich erstellt',
      '📅 Event created successfully': '📅 Termin erfolgreich erstellt',
      '📅 Event Updated': '📅 Termin aktualisiert',
      '📅 Event updated': '📅 Termin aktualisiert',
      '📅 Event Deleted': '📅 Termin gelöscht',
      '📅 Event deleted': '📅 Termin gelöscht',
    }

    let nextTitle = reverseTitleMap[title] ?? title
    if (title.startsWith('📅 Added to event:')) {
      nextTitle = title.replace('📅 Added to event:', '📅 Hinzugefügt zu Termin:')
    } else if (title.startsWith('⏰ Reminder:')) {
      nextTitle = title.replace('⏰ Reminder:', '⏰ Erinnerung:')
    }

    let nextBody = (body ?? '')
      .replace(/^A new customer "([^"]+)" was added\.$/u, 'Ein neuer Kunde „$1" wurde angelegt.')
      .replace(/^You have been assigned to: /u, 'Sie wurden zugewiesen: ')
      .replace(/^You have been invited to /u, 'Sie wurden zu ')
      .replace(/^You have been added to "([^"]+)" on (.+?)\.?$/u, 'Sie wurden zu „$1" am $2 eingeladen.')
      .replace(/^Starts in /u, 'Beginnt in ')
      .replace(/(\d+)\s*min\b/gu, '$1 Min.')
      .replace(/hour\(s\)/gu, 'Stunde(n)')
      .replace(/day\(s\)/gu, 'Tag(e)')
      .replace(/week\(s\)/gu, 'Woche(n)')
      .replace(/^You have been assigned a new shift on (.+?)\. Please confirm\.$/u,
               'Ihnen wurde eine neue Schicht am $1 zugewiesen. Bitte bestätigen.')
      .replace(/^Your shift starting (.+?) has been updated\.$/u, 'Ihre Schicht ab $1 wurde aktualisiert.')
      .replace(/^(.+?) has (confirmed|rejected) the shift on (.+?)$/u,
               (_m, who, what, when) => `${who} hat die Schicht am ${when} ${what === 'confirmed' ? 'bestätigt' : 'abgelehnt'}`)

    return { title: nextTitle, body: nextBody }
  }

  // ---------- DE → EN ----------
  const titleMap: Record<string, string> = {
    '🏢 Neuer Kunde angelegt': '🏢 New customer added',
    '✅ Einsatzplan bestätigt': '✅ Plan confirmed',
    '✅ Einsatzplan vom Mitarbeiter bestätigt': '✅ Plan confirmed by employee',
    '❌ Einsatzplan abgelehnt': '❌ Plan rejected',
    '📋 Neue Schicht zugewiesen': '📋 New shift assigned',
    '📋 Schicht aktualisiert': '📋 Shift updated',
    '📅 Termin erfolgreich erstellt': '📅 Event created successfully',
    '📅 Termin aktualisiert': '📅 Event updated',
    '📅 Termin gelöscht': '📅 Event deleted',
  }

  let nextTitle = titleMap[title] ?? title

  // Parametric titles — flip the leading German fragment, keep the dynamic tail
  if (title.startsWith('📅 Hinzugefügt zu Termin:')) {
    nextTitle = title.replace('📅 Hinzugefügt zu Termin:', '📅 Added to event:')
  } else if (title.startsWith('⏰ Erinnerung:')) {
    nextTitle = title.replace('⏰ Erinnerung:', '⏰ Reminder:')
  }

  // Body — replace the most common German phrases with English equivalents.
  // We treat body as best-effort: missed phrases stay German, which is still
  // intelligible context for the user.
  let nextBody = (body ?? '')
    .replace(/^Ein neuer Kunde „([^"]+)" wurde angelegt\.$/u, 'A new customer "$1" was added.')
    .replace(/^Sie wurden zugewiesen: /u, 'You have been assigned to: ')
    .replace(/^Sie wurden zu /u, 'You have been invited to ')
    .replace(/ am (.+?) eingeladen/u, ' on $1')
    .replace(/ eingeladen$/u, '')
    .replace(/^Beginnt in /u, 'Starts in ')
    .replace(/Min\.\b/u, 'min')
    .replace(/Stunde\(n\)/u, 'hour(s)')
    .replace(/Tag\(e\)/u, 'day(s)')
    .replace(/Woche\(n\)/u, 'week(s)')
    .replace(/^Ihnen wurde eine neue Schicht am (.+?) zugewiesen\. Bitte bestätigen\.$/u,
             'You have been assigned a new shift on $1. Please confirm.')
    .replace(/^Ihre Schicht ab (.+?) wurde aktualisiert\.$/u, 'Your shift starting $1 has been updated.')
    .replace(/^([^\s]+) hat die Schicht am (.+?) (bestätigt|abgelehnt)$/u,
             (_m, who, when, what) => `${who} has ${what === 'bestätigt' ? 'confirmed' : 'rejected'} the shift on ${when}`)

  return { title: nextTitle, body: nextBody }
}

function timeAgo(dateStr: string, locale: 'de' | 'en') {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (locale === 'de') {
    if (mins < 1) return 'gerade eben'
    if (mins < 60) return `vor ${mins} Min.`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `vor ${hrs} Std.`
    return `vor ${Math.floor(hrs / 24)} Tag(en)`
  }
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [bellRinging, setBellRinging] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { notifications, unreadCount, markAllAsRead, markAsRead, loading } = useNotifications()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  // Bell ring animation when count increases
  useEffect(() => {
    if (unreadCount > prevCount && prevCount !== 0) {
      setBellRinging(true)
      setTimeout(() => setBellRinging(false), 700)
    }
    setPrevCount(unreadCount)
  }, [unreadCount])

  // Toast on new notification (when panel is closed)
  useEffect(() => {
    const latest = notifications[0]
    if (!latest || latest.is_read || open) return
    const age = Date.now() - new Date(latest.created_at).getTime()
    if (age < 5000) { // only show toast if notification arrived recently
      const localized = translateNotification(latest.title, latest.body as any, locale)
      toast(localized.title, {
        description: localized.body,
        duration: 5000,
        action: {
          label: L('Anzeigen', 'View'),
          onClick: () => router.push(moduleRoutes[latest.type as string] || '/dashboard')
        }
      })
    }
  }, [notifications[0]?.id])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {/* Bell Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-gray-100 transition-all duration-200 group"
        title={L('Benachrichtigungen', 'Notifications')}
      >
        <Bell className={cn(
          "w-5 h-5 transition-all duration-200",
          bellRinging && "animate-[ring_0.7s_ease-in-out]",
          open ? "text-[#0064E0]" : "text-gray-600 group-hover:text-gray-900"
        )} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black ring-2 ring-white shadow-md shadow-red-200 animate-in zoom-in duration-200 px-1 tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel
          - Mobile: fixed sheet pinned to the right edge of the viewport
            with small side gutters, so the panel never overflows the
            screen and the German title isn't clipped.
          - Desktop (sm+): classic dropdown anchored to the bell button. */}
      {open && (
        <>
          {/* Backdrop on mobile so tapping outside closes the sheet. */}
          <div
            onClick={() => setOpen(false)}
            className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[99] animate-in fade-in duration-150"
          />
          <div
            className={cn(
              // Mobile sheet
              "fixed left-2 right-2 top-16 w-auto",
              // Desktop dropdown
              "sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[420px]",
              "max-h-[80vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
            )}
          >
          {/* Header — flex-wrap so the long German "Alle als gelesen markieren"
             label can drop onto its own line when the title + badge already
             eat the available width, instead of vertically wrapping inside
             the button itself. */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base font-bold text-[#0064E0] whitespace-nowrap">
                {L('Benachrichtigungen', 'Notifications')}
              </h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold tabular-nums">
                  {unreadCount}&nbsp;{L('neu', 'new')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title={L('Alle als gelesen markieren', 'Mark all read')}
                  className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-[#0064E0] px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {L('Alle gelesen', 'Mark all read')}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-all" title={L('Schließen', 'Close')}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List — flex-1 so the list itself owns the remaining sheet
             height (especially important on the mobile fixed-sheet layout
             where max-h is set on the wrapper). */}
          <div className="flex-1 overflow-y-auto sm:max-h-[420px]">
            {loading ? (
              <div className="p-8 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-400">{L('Alles erledigt!', 'All caught up!')}</p>
                <p className="text-xs text-gray-300 mt-1">{L('Keine neuen Benachrichtigungen.', 'No new notifications.')}</p>
              </div>
            ) : (
              notifications.map(n => {
                const localized = translateNotification(n.title, n.body as any, locale)
                return (
                <button
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id)
                    router.push(moduleRoutes[n.type] || '/dashboard')
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 animate-in fade-in",
                    !n.is_read && "bg-blue-50/40"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5", moduleBg[n.type] || 'bg-gray-50')}>
                    {moduleIcons[n.type] || <Bell className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug", n.is_read ? "font-medium text-gray-600" : "font-bold text-gray-900")}>
                        {localized.title}
                      </p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#0064E0] flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{localized.body}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-wide">{timeAgo(n.created_at, locale)}</p>
                  </div>
                </button>
              )})
            )}
          </div>
          </div>
        </>
      )}
    </div>
  )
}
