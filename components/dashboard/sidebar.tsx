// components/dashboard/sidebar.tsx
'use client'

import { cn } from '@/lib/utils'
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
    Activity,
    Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function SidebarContent({ collapsed = false, onItemClick }: { collapsed?: boolean, onItemClick?: () => void }) {
    const { locale } = useTranslation()
    const { role, isAdmin, isDispatcher, isEmployee } = useUser()
    const pathname = usePathname()

    // ──────────────────────────────────────────────────────────────────────────
    // Nav Navigation Matrix (Derived from Client Sections 4.1-4.3)
    // ──────────────────────────────────────────────────────────────────────────
    const navItems = [
        { id: 'dashboard', href: '/dashboard', label: locale === 'en' ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard },
        { id: 'live', href: '/dashboard/live', label: locale === 'en' ? 'Live Operations' : 'Live-Betrieb', icon: Activity, roles: ['admin', 'dispatcher'] },
        { id: 'calendar', href: '/dashboard/calendar', label: locale === 'en' ? 'Calendar' : 'Kalender', icon: Calendar },
        { id: 'plans', href: '/dashboard/plans', label: locale === 'en' ? 'Mission Plans' : 'Einsatzpläne', icon: FileText },
        { id: 'times', href: '/dashboard/times', label: locale === 'en' ? 'Time Tracking' : 'Zeiterfassung', icon: Clock },
        { id: 'time-account', href: '/dashboard/time-account', label: locale === 'en' ? 'Time Account' : 'Zeitkonto', icon: BarChart3 },
        { id: 'per-diem', href: '/dashboard/per-diem', label: locale === 'en' ? 'Per Diem' : 'Verpflegung', icon: Wallet },
        { id: 'holiday-bonus', href: '/dashboard/holiday-bonus', label: locale === 'en' ? 'Holiday Bonus' : 'Holiday Bonus', icon: Star },
        { id: 'customers', href: '/dashboard/customers', label: locale === 'en' ? 'Customers' : 'Kunden', icon: Users, roles: ['admin', 'dispatcher'] },
        { id: 'reports', href: '/dashboard/reports', label: locale === 'en' ? 'Reports' : 'Berichte', icon: BarChart3, roles: ['admin', 'dispatcher'] },
        { id: 'chat', href: '/dashboard/chat', label: locale === 'en' ? 'Team Chat' : 'Team-Chat', icon: MessageSquare },
        { id: 'users', href: '/dashboard/users', label: locale === 'en' ? 'User Management' : 'Benutzerverwaltung', icon: ShieldAlert, roles: ['admin'] },
        { id: 'settings', href: '/dashboard/settings', label: locale === 'en' ? 'Settings' : 'Einstellungen', icon: Settings },
    ]

    const filteredItems = navItems.filter(item => {
        if (item.roles && !item.roles.includes(role)) return false;
        return true;
    })

    const roleColors: Record<string, string> = {
        admin: 'bg-blue-600 text-white border-blue-700 shadow-blue-100',
        dispatcher: 'bg-slate-800 text-white border-slate-900 shadow-slate-100',
        employee: 'bg-slate-100 text-slate-600 border-slate-200 shadow-none',
    }

    const roleLabels: Record<string, string> = {
        admin: 'ADMINISTRATOR',
        dispatcher: 'DISPATCHER',
        employee: 'EMPLOYEE',
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-hide">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                        <Link key={item.id} href={item.href} onClick={onItemClick} className="block group">
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start gap-4 h-12 mb-1 rounded-xl transition-all duration-300 font-bold border border-transparent',
                                    isActive ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900',
                                    collapsed && 'px-0 justify-center'
                                )}
                            >
                                <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110', isActive ? 'text-blue-600' : 'text-slate-400')} />
                                {!collapsed && <span className="text-[13px] tracking-tight">{item.label}</span>}
                                {isActive && !collapsed && (
                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                                )}
                            </Button>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                {!collapsed && (
                    <div className={cn(
                        "text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border text-center shadow-sm",
                        roleColors[role] || 'bg-muted text-muted-foreground'
                    )}>
                        {roleLabels[role] || role}
                    </div>
                )}
            </div>
        </div>
    )
}

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                'hidden md:flex flex-col border-r border-slate-100 bg-white transition-all duration-500 h-screen sticky top-0 ease-in-out z-40 shadow-sm',
                collapsed ? 'w-20' : 'w-72'
            )}
        >
            <div className="flex h-24 pt-4 pb-0 items-center justify-between px-6 border-b border-slate-50">
                {!collapsed && (
                    <div className="flex items-center animate-in fade-in duration-700">
                        <Image
                            src="/logo-3.png"
                            alt="LokShift"
                            width={130}
                            height={36}
                            className="h-8 w-auto object-contain"
                            priority
                        />
                    </div>
                )}
                {collapsed && (
                    <Image
                        src="/icon-dark-32x32.png"
                        alt="LokShift"
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain mx-auto"
                        priority
                    />
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn("hover:bg-slate-50 rounded-xl transition-all", !collapsed && "ml-auto")}
                >
                    {collapsed ? <Menu className="h-5 w-5 text-slate-400" /> : <X className="h-5 w-5 text-slate-400" />}
                </Button>
            </div>
            <SidebarContent collapsed={collapsed} />
        </aside>
    )
}
