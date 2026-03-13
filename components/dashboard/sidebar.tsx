'use client'

import { cn } from '@/lib/utils'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'

export type ViewType = 'dashboard' | 'leads' | 'jobs' | 'technicians' | 'reviews' | 'automations' | 'settings'

interface SidebarProps {
    activeView: ViewType
    onViewChange: (view: ViewType) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const { locale } = useTranslation()

    const navItems = [
        { id: 'dashboard' as const, label: locale === 'en' ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard },
        { id: 'leads' as const, label: locale === 'en' ? 'Leads' : 'Leads', icon: UserPlus },
        { id: 'jobs' as const, label: locale === 'en' ? 'Jobs' : 'Aufträge', icon: Briefcase },
        { id: 'technicians' as const, label: locale === 'en' ? 'Technicians' : 'Techniker', icon: Users },
        { id: 'reviews' as const, label: locale === 'en' ? 'Reviews' : 'Bewertungen', icon: Star },
        { id: 'automations' as const, label: locale === 'en' ? 'Automations' : 'Automatisierung', icon: Zap },
        { id: 'settings' as const, label: locale === 'en' ? 'Settings' : 'Einstellungen', icon: Settings },
    ]

    return (
        <aside
            className={cn(
                'flex flex-col border-r border-border bg-card transition-all duration-300',
                collapsed ? 'w-20' : 'w-64'
            )}
        >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                {!collapsed && (
                    <span className="text-lg font-bold text-primary">fixdone.de</span>
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

            <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeView === item.id
                    return (
                        <Button
                            key={item.id}
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                                'w-full justify-start gap-3 h-10',
                                isActive && 'bg-primary/10 text-primary hover:bg-primary/20',
                                collapsed && 'px-2 justify-center'
                            )}
                            onClick={() => onViewChange(item.id)}
                        >
                            <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                            {isActive && !collapsed && (
                                <div className="ml-auto h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                        </Button>
                    )
                })}
            </nav>

            <div className="p-3 border-t border-border">
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
            </div>
        </aside>
    )
}
