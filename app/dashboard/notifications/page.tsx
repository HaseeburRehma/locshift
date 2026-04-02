// app/dashboard/notifications/page.tsx
'use client'

import React, { useState } from 'react'
import { Bell, Check, Trash2, Calendar, MessageSquare, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Notification } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

export default function NotificationsPage() {
  const { locale } = useTranslation()

  // Placeholder data for UI demonstration
  const [notifications] = useState<any[]>([
    {
      id: '1',
      title: 'New Shift Assigned',
      message: 'You have been assigned to Route 42 for tomorrow at 06:00.',
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Time Log Approved',
      message: 'Your working hours for March 30th have been verified.',
      type: 'success',
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      title: 'System Update',
      message: 'Lokshift v2.0 is now live with enhanced real-time chat.',
      type: 'warning',
      is_read: true,
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-0">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            {locale === 'en' ? 'Notifications' : 'Benachrichtigungen'}
          </h2>
          <p className="text-muted-foreground font-medium">Stay updated with your latest assignments and system events.</p>
        </div>
        <Button variant="ghost" className="text-primary font-bold text-sm h-12 rounded-2xl hover:bg-primary/5">
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-2 px-4 md:px-0">
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={cn(
               "group relative bg-white border rounded-[2rem] p-6 transition-all hover:shadow-md cursor-pointer flex items-start gap-4",
               !notif.is_read ? "border-primary/20 shadow-sm" : "border-gray-100 opacity-80"
            )}
          >
             <div className={cn(
               "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-solid transition-transform group-hover:scale-110",
               notif.type === 'info' ? "bg-blue-50 text-[#0064E0] border-blue-100" : 
               notif.type === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
               "bg-orange-50 text-orange-600 border-orange-100"
             )}>
                {notif.type === 'info' ? <Calendar className="w-6 h-6" /> : 
                 notif.type === 'success' ? <Check className="w-6 h-6" /> : 
                 <AlertCircle className="w-6 h-6" />}
             </div>

             <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                   <h3 className="font-extrabold text-gray-900">{notif.title}</h3>
                   <span className="text-[10px] font-black uppercase text-gray-400">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
                <p className="text-sm font-semibold text-gray-500 leading-relaxed pr-8">
                   {notif.message}
                </p>
             </div>

             {!notif.is_read && (
               <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-primary" />
             )}
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
           <Bell className="w-16 h-16 text-gray-200" />
           <p className="text-gray-400 font-bold">You're all caught up!</p>
        </div>
      )}
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
