// components/dashboard/sidebar.tsx
'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
    LayoutDashboard,
    UserPlus,
    Briefcase,
    Users,
    Star,
    Zap,
    Settings,
    Menu,
    X,
    MessageSquare,
    BarChart,
    Building2,
    BarChart3,
    ShoppingCart,
    ShieldAlert,
    Handshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { usePermissions } from '@/lib/rbac/usePermissions'
import { Permission } from '@/lib/rbac/permissions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type ViewType = 'dashboard' | 'leads' | 'jobs' | 'technicians' | 'reviews' | 'automations' | 'settings' | 'partners' | 'users' | 'messages' | 'kpi' | 'finance'

interface SidebarProps {
    activeView?: ViewType
    onViewChange?: (view: ViewType) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const { locale } = useTranslation()
    const { can, role, isTechnician } = usePermissions()
    const pathname = usePathname()

    const navItems = [
        { id: 'dashboard', href: '/dashboard', label: locale === 'en' ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard, permission: undefined },
        { id: 'leads', href: '/dashboard/leads', label: locale === 'en' ? 'Leads' : 'Interessenten', icon: UserPlus, permission: 'leads.view' as Permission },
        {
            id: 'jobs',
            href: '/dashboard/jobs',
            label: isTechnician
                ? (locale === 'en' ? 'My Jobs' : 'Meine Aufträge')
                : (locale === 'en' ? 'Jobs' : 'Aufträge'),
            icon: Briefcase,
            permission: 'jobs.view' as Permission
        },
        { id: 'technicians', href: '/dashboard/technicians', label: locale === 'en' ? 'Technicians' : 'Techniker', icon: Users, permission: 'technicians.view' as Permission },
        { id: 'partners', href: '/dashboard/partners', label: locale === 'en' ? 'Partners' : 'Partner', icon: Handshake, permission: 'partners.view' as Permission },
        { id: 'users', href: '/dashboard/users', label: locale === 'en' ? 'User Roles' : 'Benutzerrollen', icon: ShieldAlert, permission: 'settings.manage' as Permission },
        { id: 'reviews', href: '/dashboard/reviews', label: locale === 'en' ? 'Reviews' : 'Bewertungen', icon: Star, permission: 'reviews.view' as Permission },
        { id: 'finance', href: '/dashboard/finance', label: locale === 'en' ? 'Finance' : 'Finanzen', icon: BarChart3, permission: 'finance.view' as Permission },
        { id: 'automations', href: '/dashboard/automations', label: locale === 'en' ? 'Automations' : 'Automatisierung', icon: Zap, permission: 'automations.view' as Permission },
        { id: 'messages', href: '/dashboard/messages', label: locale === 'en' ? 'Messages' : 'Nachrichten', icon: MessageSquare, permission: 'leads.view' as Permission },
        { id: 'kpi', href: '/dashboard/kpi', label: locale === 'en' ? 'Analytics' : 'Analysen', icon: BarChart, permission: 'finance.view' as Permission },
        { id: 'settings', href: '/dashboard/settings', label: locale === 'en' ? 'Settings' : 'Einstellungen', icon: Settings, permission: 'settings.view' as Permission },
    ]

    const filteredItems = navItems.filter(item => {
        if (role === 'admin') return true; // Admins see everything
        return !item.permission || can(item.permission as Permission);
    })

    const roleColors: Record<string, string> = {
        admin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        manager: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        disponent: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        technician: 'bg-green-500/10 text-green-500 border-green-500/20',
        viewer: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        partner_admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        partner_agent: 'bg-purple-100 text-purple-700 border-purple-500/30'
    }

    return (
        <aside
            className={cn(
                'flex flex-col border-r border-border bg-card transition-all duration-300 h-screen',
                collapsed ? 'w-20' : 'w-64'
            )}
        >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                {!collapsed && (
                    <Image src="/logo.png" alt="FixDone Logo" width={120} height={28} className="h-7 w-auto" />
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
                <div className={cn('rounded-lg bg-primary/5 p-3', collapsed && 'p-2 flex justify-center')}>
                    {!collapsed ? (
                        <>
                            <p className="text-xs font-medium text-primary mb-1">
                                {locale === 'en' ? 'AI Agents active' : 'KI-Agenten aktiv'}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                {locale === 'en'
                                    ? 'Qualification & matching running in background.'
                                    : 'Qualifizierung und Matchmaking laufen im Hintergrund.'}
                            </p>
                        </>
                    ) : (
                        <Zap className="h-4 w-4 text-primary animate-pulse" />
                    )}
                </div>

                {!collapsed && (
                    <div className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border text-center transition-all",
                        roleColors[role] || 'bg-muted text-muted-foreground'
                    )}>
                        {role === 'admin' ? 'SYSTEM ADMINISTRATOR' : role}
                    </div>
                )}
            </div>
        </aside>
    )
}

