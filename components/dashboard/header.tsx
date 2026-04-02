'use client'

import { useRouter } from 'next/navigation'
import { Zap, Bell, Settings, LogOut, User, Shield, Globe, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export function DashboardHeader() {
  const { user, profile, role, signOut, isLoading } = useUser()
  const { locale, setLocale } = useTranslation()
  const router = useRouter()

  const roleLabels: Record<string, string> = {
    admin: locale === 'en' ? 'Administrator' : 'Administrator',
    manager: locale === 'en' ? 'Manager' : 'Manager',
    disponent: locale === 'en' ? 'Dispatcher' : 'Disponent',
    technician: locale === 'en' ? 'Technician' : 'Techniker',
    viewer: locale === 'en' ? 'Viewer' : 'Betrachter',
    partner_admin: locale === 'en' ? 'Partner Admin' : 'Partner Admin',
    partner_agent: locale === 'en' ? 'Partner Agent' : 'Partner Agent',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive text-destructive-foreground font-black',
    manager: 'bg-primary text-primary-foreground font-black',
    disponent: 'bg-blue-500 text-white font-black',
    technician: 'bg-emerald-500 text-white font-black',
    viewer: 'bg-muted text-muted-foreground font-medium',
    partner_admin: 'bg-indigo-600 text-white font-black',
    partner_agent: 'bg-indigo-100 text-indigo-700 font-bold',
  }

  const handleSignOut = async () => {
    try {
      // 1. Sign out on the server - this clears the session cookies
      await fetch('/api/auth/signout', { method: 'POST' })
      
      // 2. Clear client-side state
      await signOut()
      
      // 3. Hard redirect to /login to force a clean state
      window.location.replace('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      // Fallback redirect anyway
      window.location.replace('/login')
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile: Hamburger + Logo Center / Desktop: Left Logo */}
        <div className="flex-1 flex items-center gap-3">
          {/* Hamburger Menu (Mobile Only) */}
          <button className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex justify-center md:justify-start">
            <Image 
              src="/logo-3.png" 
              alt="LokShift Logo" 
              width={140} 
              height={32} 
              className="h-7 w-auto md:h-8" 
            />
            <div className="hidden sm:block border-l border-border pl-3 ml-1">
              <p className="text-xs text-muted-foreground whitespace-nowrap">Operations Center</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Language toggle (Desktop Only) */}
          <button
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de' as Locale)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted hidden md:flex"
            title={locale === 'en' ? 'Switch to German' : 'Auf Englisch umstellen'}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="uppercase">{locale}</span>
          </button>

          {/* Live Notification Panel — replaces the static bell */}
          <NotificationPanel />

          {!isLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-1 md:px-2 rounded-2xl md:rounded-xl hover:bg-transparent active:bg-transparent ring-0 focus-visible:ring-0">
                  <Avatar className="h-9 w-9 md:h-10 md:w-10 rounded-2xl md:rounded-xl shadow-sm transition-transform active:scale-95 group-hover:scale-105">
                    <AvatarFallback className="bg-[#0064E0] text-white text-sm font-black ring-2 ring-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex md:flex-col md:items-start text-left">
                    <span className="text-sm font-bold text-gray-900 leading-none mb-1">
                      {profile?.full_name ?? user.email?.split('@')[0]}
                    </span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleColors[role]}`}>
                      {roleLabels[role]}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-gray-100 shadow-xl p-2">
                <DropdownMenuLabel className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{profile?.full_name ?? (locale === 'en' ? 'User' : 'Benutzer')}</span>
                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[140px]">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-50 my-1" />
                <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-sm">{locale === 'en' ? 'Settings' : 'Einstellungen'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-50 my-1" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-bold text-sm">{locale === 'en' ? 'Sign out' : 'Abmelden'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
