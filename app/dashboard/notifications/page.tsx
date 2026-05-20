'use client'

import React from 'react'
import { Bell, Check, Trash2, Calendar, AlertCircle, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { de as deLocale, enUS } from 'date-fns/locale'

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

// Pick the visual style based on the notification's `module_type`.
function iconForModule(module?: string | null) {
  switch (module) {
    case 'plans':
    case 'calendar':
    case 'shifts':
      return { Icon: Calendar, bg: 'bg-blue-50',     text: 'text-[#0064E0]', border: 'border-blue-100' }
    case 'chat':
      return { Icon: MessageSquare, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' }
    case 'system':
      return { Icon: AlertCircle, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' }
    default:
      return { Icon: Bell, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' }
  }
}

export default function NotificationsPage() {
  const { locale } = useTranslation()
  const { notifications, loading, markAllAsRead, markAsRead, deleteNotification } = useNotifications()
  const dateLocale = locale === 'de' ? deLocale : enUS

  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-0">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            {L('Benachrichtigungen', 'Notifications')}
          </h2>
          <p className="text-muted-foreground font-medium">
            {L('Bleiben Sie über Ihre Einsätze und Systemereignisse auf dem Laufenden.',
               "Stay updated with your latest assignments and system events.")}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={markAllAsRead}
          disabled={loading || notifications.every(n => n.is_read)}
          className="text-primary font-bold text-sm h-12 rounded-2xl hover:bg-primary/5"
        >
          {L('Alle als gelesen markieren', 'Mark All as Read')}
        </Button>
      </div>

      <div className="space-y-2 px-4 md:px-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Bell className="w-16 h-16 text-gray-200" />
            <p className="text-gray-400 font-bold">{L('Sie sind auf dem neuesten Stand!', "You're all caught up!")}</p>
          </div>
        ) : (
          notifications.map(notif => {
            const { Icon, bg, text, border } = iconForModule((notif as any).module_type)
            return (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={cn(
                  'group relative bg-white border rounded-[2rem] p-6 transition-all hover:shadow-md cursor-pointer flex items-start gap-4',
                  !notif.is_read ? 'border-primary/20 shadow-sm' : 'border-gray-100 opacity-80',
                )}
              >
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-solid transition-transform group-hover:scale-110', bg, text, border)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-gray-900">{notif.title}</h3>
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 leading-relaxed pr-8">
                    {notif.body ?? ''}
                  </p>
                </div>

                {!notif.is_read && (
                  <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-primary" />
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50"
                  title={L('Löschen', 'Delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
