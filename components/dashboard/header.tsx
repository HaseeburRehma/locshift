'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Bell, Settings, LogOut, User, Globe, Menu, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { SidebarContent } from './sidebar'
import { useState } from 'react'

export function DashboardHeader() {
  const { user, profile, role, signOut, isLoading } = useUser()
  const { locale, setLocale, t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'),
    dispatcher: t('role.dispatcher'),
    employee: t('role.employee'),
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-blue-600 text-white shadow-blue-100',
    dispatcher: 'bg-slate-800 text-white shadow-slate-100',
    employee: 'bg-slate-100 text-slate-600 shadow-none',
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      await signOut()
      window.location.replace('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      window.location.replace('/login')
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="z-50 border-b border-slate-100 bg-white backdrop-blur-xl flex-shrink-0">
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex-1 flex items-center gap-4">
          {/* Mobile: Hamburger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-white border-none">
              <SheetHeader className="p-6 border-b border-slate-50 bg-white">
                <SheetTitle className="sr-only">LokShift Nav Menu</SheetTitle>
                <div className="flex items-center">
                  <Image 
                    src="/logo-3.png" 
                    alt="LokShift" 
                    width={130} 
                    height={36} 
                    className="h-8 w-auto object-contain" 
                    priority 
                  />
                </div>
              </SheetHeader>
              <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>



          {/* Mobile Center Logo */}
          <div className="flex-1 flex justify-center md:hidden pr-8">
            <Image 
              src="/logo-3.png" 
              alt="LokShift" 
              width={100} 
              height={28} 
              className="h-6 w-auto object-contain" 
              priority 
            />
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md ml-4 lg:ml-8 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              type="text"
              placeholder={t('nav.search')}
              className="w-full h-11 bg-slate-50 border-none rounded-xl pl-11 pr-4 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100/50 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de' as Locale)}
            className="hidden md:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-blue-50"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{locale}</span>
          </button>

          <NotificationPanel />

          {!isLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 p-1 rounded-2xl md:rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                  <Avatar className="h-10 w-10 rounded-xl shadow-sm transition-transform active:scale-95 group-hover:scale-105 border border-white">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-blue-600 text-white text-xs font-black">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start transition-all">
                    <span className="text-[13px] font-bold text-slate-900 leading-none mb-1.5">
                      {profile?.full_name ?? user.email?.split('@')[0]}
                    </span>
                    <Badge variant="secondary" className={cn("text-[9px] px-2 py-0 h-4 font-black uppercase tracking-widest rounded-full border-none", roleColors[role])}>
                      {roleLabels[role]}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-[1.5rem] border-slate-100 shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <DropdownMenuLabel className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shadow-inner overflow-hidden border border-blue-100">
                    {profile?.avatar_url ? (
                       <Image src={profile.avatar_url} alt="Profile" width={44} height={44} className="w-full h-full object-cover" />
                    ) : (
                       <User className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 leading-none mb-1">{profile?.full_name ?? 'User'}</span>
                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[140px] tracking-tight">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-50 mx-2" />
                <DropdownMenuItem className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                  <span className="font-bold text-xs uppercase tracking-widest text-slate-600 group-hover:text-slate-900">{t('header.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-50 mx-2" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50 group transition-all"
                >
                  <LogOut className="h-4 w-4 text-red-400 group-hover:translate-x-1 transition-transform" />
                  <span className="font-black text-xs uppercase tracking-widest">{t('header.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
