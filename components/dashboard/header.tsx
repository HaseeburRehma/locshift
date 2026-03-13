'use client'

import { useRouter } from 'next/navigation'
import { Zap, Bell, Settings, LogOut, User, Shield, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
    dispatcher: locale === 'en' ? 'Dispatcher' : 'Disponent',
    technician: locale === 'en' ? 'Technician' : 'Techniker',
    viewer: locale === 'en' ? 'Viewer' : 'Betrachter',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive text-destructive-foreground',
    manager: 'bg-primary text-primary-foreground',
    dispatcher: 'bg-accent text-accent-foreground',
    technician: 'bg-secondary text-secondary-foreground',
    viewer: 'bg-muted text-muted-foreground',
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">fixdone.de</h1>
            <p className="text-xs text-muted-foreground">Operations Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de' as Locale)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted hidden md:flex"
            title={locale === 'en' ? 'Switch to German' : 'Auf Englisch umstellen'}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="uppercase">{locale}</span>
          </button>

          <Button variant="ghost" size="icon" className="relative" title={locale === 'en' ? 'Notifications' : 'Benachrichtigungen'}>
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              3
            </span>
          </Button>

          {!isLoading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex md:flex-col md:items-start text-left">
                    <span className="text-sm font-medium">
                      {profile?.full_name ?? user.email?.split('@')[0]}
                    </span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleColors[role]}`}>
                      {roleLabels[role]}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{profile?.full_name ?? (locale === 'en' ? 'User' : 'Benutzer')}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{locale === 'en' ? 'Role' : 'Rolle'}: {roleLabels[role]}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => router.push('/dashboard?view=settings')}>
                  <Settings className="h-4 w-4" />
                  {locale === 'en' ? 'Settings' : 'Einstellungen'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {locale === 'en' ? 'Sign out' : 'Abmelden'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
