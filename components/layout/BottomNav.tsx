'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Activity, 
  Send, 
  Calendar, 
  Settings,
  FileText,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/user-context'

export function BottomNav() {
  const pathname = usePathname()
  const { role, isEmployee, isAdmin, isDispatcher } = useUser()
  
  // Real-time notification checks would go here
  const unreadChatCount = 0 

  const navItems = [
    { href: '/dashboard',          icon: Home,     label: 'Home' },
    { href: '/dashboard/plans',    icon: FileText, label: 'Plans' },
    { href: '/dashboard/times',    icon: Clock,    label: 'Times' },
    { href: '/dashboard/chat',     icon: Send,     label: 'Chat' },
    { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  ]

  // Filter out 'Plans' or others if needed, but usually employees need them most on mobile
  const filteredTabs = navItems

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white/80 backdrop-blur-xl border-t border-slate-100 h-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {filteredTabs.map(({ href, icon: Icon, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-all active:scale-95"
          >
            {/* Soft glow behind active tab */}
            {active && (
              <div className="absolute inset-0 bg-blue-50/50 animate-in fade-in duration-500" />
            )}

            <div className="relative z-10">
              <Icon
                className={cn(
                  "w-6 h-6 transition-all duration-500",
                  active ? "text-blue-600 stroke-[2.5px] scale-110" : "text-slate-400"
                )}
              />
              
              {/* Notification Badge for Chat */}
              {label === 'Chat' && unreadChatCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-black shadow-lg ring-2 ring-white">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </div>

            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative z-10",
              active ? "text-blue-600 translate-y-[-2px]" : "text-slate-400"
            )}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
