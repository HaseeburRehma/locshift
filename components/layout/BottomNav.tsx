'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Activity, Send, Calendar, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard',          icon: Home,     label: 'Home'     },
  { href: '/dashboard/live',     icon: Activity, label: 'Live'     },
  { href: '/dashboard/chat',     icon: Send,     label: 'Chat'     },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calender' },
  { href: '/dashboard/settings', icon: Settings, label: 'Setting'  },
]

export function BottomNav() {
  const pathname = usePathname()
  
  // Mock count for demonstration - in production this would come from a real-time hook
  const unreadChatCount = 3 

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white border-t border-gray-100 h-16 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
          >
            {/* Blue active line at the TOP of the nav item */}
            <div className={cn(
              "absolute top-0 w-full h-[2px] transition-all duration-300",
              active ? "bg-[#0064E0]" : "bg-transparent"
            )} />

            <div className="relative">
              <Icon
                className={cn(
                  "w-6 h-6 transition-all duration-300",
                  active ? "text-[#0064E0] stroke-[2.5px]" : "text-gray-400"
                )}
              />
              
              {/* Notification Badge for Chat */}
              {label === 'Chat' && unreadChatCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-black shadow-sm ring-2 ring-white">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </div>

            <span className={cn(
              "text-[10px] font-bold transition-all duration-300 tracking-tight",
              active ? "text-[#0064E0]" : "text-gray-400"
            )}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
