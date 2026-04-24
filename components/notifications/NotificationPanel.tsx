'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, Calendar, FileText, Users, Zap, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

const moduleIcons: Record<string, React.ReactNode> = {
  plans:     <FileText className="w-4 h-4 text-blue-600" />,
  calendar:  <Calendar className="w-4 h-4 text-purple-600" />,
  customers: <Users className="w-4 h-4 text-emerald-600" />,
  shifts:    <Zap className="w-4 h-4 text-amber-600" />,
  system:    <Zap className="w-4 h-4 text-gray-500" />,
  new_lead:  <Users className="w-4 h-4 text-blue-600" />, // Added missing types
  job_assigned: <Zap className="w-4 h-4 text-amber-600" />,
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
      toast(latest.title, {
        description: latest.body,
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

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-[380px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-gray-900">{L('Benachrichtigungen', 'Notifications')}</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-black tabular-nums">
                  {unreadCount} {L('neu', 'new')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0064E0] px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {L('Alle als gelesen markieren', 'Mark all read')}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-all">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
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
              notifications.map(n => (
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
                    {moduleIcons[n.type] || <Zap className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug", n.is_read ? "font-medium text-gray-600" : "font-bold text-gray-900")}>
                        {n.title}
                      </p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#0064E0] flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-wide">{timeAgo(n.created_at, locale)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
