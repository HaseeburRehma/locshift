'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, UserPlus, Star, Briefcase, CheckCircle, MessageSquare, AlertTriangle, Zap, Check } from 'lucide-react'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { de, enGB } from 'date-fns/locale'

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const prevUnreadCount = useRef(unreadCount)
  const router = useRouter()

  const hasNew = unreadCount > prevUnreadCount.current
  
  useEffect(() => {
    prevUnreadCount.current = unreadCount
  }, [unreadCount])

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_lead': return <UserPlus className="w-4 h-4 text-blue-500" />
      case 'lead_qualified': return <Star className="w-4 h-4 text-yellow-500" />
      case 'job_assigned': return <Briefcase className="w-4 h-4 text-green-500" />
      case 'job_completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'review_received': return <MessageSquare className="w-4 h-4 text-purple-500" />
      case 'urgent_lead': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'automation_fired': return <Zap className="w-4 h-4 text-orange-500" />
      default: return <Bell className="w-4 h-4 text-slate-400" />
    }
  }

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
    }
    setIsOpen(false)
    if (notif.action_url) {
      router.push(notif.action_url)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white",
              hasNew && "animate-pulse"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto text-xs text-blue-600 hover:text-blue-700 p-0"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 border-b last:border-0",
                    !notif.is_read && "bg-blue-50/50"
                  )}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className={cn(
                      "text-sm line-clamp-1",
                      !notif.is_read ? "font-semibold" : "font-medium"
                    )}>
                      {notif.title}
                    </span>
                    {notif.body && (
                      <span className="text-xs text-slate-500 line-clamp-2">
                        {notif.body}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {!notif.is_read && (
                    <div className="mt-1 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
              <Bell className="w-8 h-8 opacity-20" />
              <p className="text-xs">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
        <div className="border-t">
          <Button 
            variant="ghost" 
            className="w-full h-10 text-xs text-slate-500 hover:text-slate-900"
            onClick={() => {
              setIsOpen(false)
              router.push('/dashboard/notifications')
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
