// components/dashboard/sidebar.tsx
'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
    LayoutDashboard,
    Calendar,
    Clock,
    BarChart3,
    Wallet,
    Star,
    Users,
    FileText,
    MessageSquare,
    ShieldAlert,
    Settings,
    Menu,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const { locale } = useTranslation()
    const { role, isAdmin, isDispatcher } = useUser()
    const pathname = usePathname()

    const navItems = [
        { id: 'dashboard', href: '/dashboard', label: locale === 'en' ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard },
        { id: 'calendar', href: '/dashboard/calendar', label: locale === 'en' ? 'Calendar' : 'Kalender', icon: Calendar },
        { id: 'plans', href: '/dashboard/plans', label: locale === 'en' ? 'Plans' : 'Pläne', icon: FileText },
        { id: 'times', href: '/dashboard/times', label: locale === 'en' ? 'Times' : 'Arbeitszeiten', icon: Clock },
        { id: 'time-account', href: '/dashboard/time-account', label: locale === 'en' ? 'Time Account' : 'Zeitkonto', icon: BarChart3 },
        { id: 'per-diem', href: '/dashboard/per-diem', label: locale === 'en' ? 'Per Diem' : 'Verpflegung', icon: Wallet },
        { id: 'holiday-bonus', href: '/dashboard/holiday-bonus', label: locale === 'en' ? 'Holiday Bonus' : 'Holiday Bonus', icon: Star },
        { id: 'customers', href: '/dashboard/customers', label: locale === 'en' ? 'Customers' : 'Kunden', icon: Users },
        { id: 'reports', href: '/dashboard/reports', label: locale === 'en' ? 'Reports' : 'Berichte', icon: FileText },
        { id: 'chat', href: '/dashboard/chat', label: locale === 'en' ? 'Chat' : 'Chat', icon: MessageSquare },
        { id: 'users', href: '/dashboard/users', label: locale === 'en' ? 'User Management' : 'Benutzerverwaltung', icon: ShieldAlert, adminOnly: true },
        { id: 'settings', href: '/dashboard/settings', label: locale === 'en' ? 'Settings' : 'Einstellungen', icon: Settings },
    ]

    const filteredItems = navItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        return true;
    })

    const roleColors: Record<string, string> = {
        admin: 'bg-red-500/10 text-red-500 border-red-500/20',
        dispatcher: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        employee: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    }

    const roleLabels: Record<string, string> = {
        admin: 'ADMINISTRATOR',
        dispatcher: 'DISPATCHER',
        employee: 'EMPLOYEE',
    }

    return (
        <aside
            className={cn(
                'hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 h-screen sticky top-0',
                collapsed ? 'w-20' : 'w-64'
            )}
        >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-black text-xl leading-none">L</span>
                        </div>
                        <span className="font-black text-xl tracking-tighter text-foreground">LokShift</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto"
                >
                    {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </Button>
            </div>

            <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                        <Link key={item.id} href={item.href}>
                            <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                className={cn(
                                    'w-full justify-start gap-3 h-10 mb-1',
                                    isActive && 'bg-primary/10 text-primary hover:bg-primary/20',
                                    collapsed && 'px-2 justify-center'
                                )}
                            >
                                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                                {isActive && !collapsed && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                            </Button>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-3 border-t border-border space-y-3">
                {!collapsed && (
                    <div className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border text-center transition-all",
                        roleColors[role] || 'bg-muted text-muted-foreground'
                    )}>
                        {roleLabels[role] || role}
                    </div>
                )}
            </div>
        </aside>
    )
}
