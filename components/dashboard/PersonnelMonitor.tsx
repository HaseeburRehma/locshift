'use client'

import React from 'react'
import {
    Users,
    MapPin,
    Clock,
    Coffee,
    AlertCircle,
    TrendingUp,
    Activity,
    ArrowRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useActiveShifts, ActiveShift } from '@/hooks/useActiveShifts'
import { formatDistanceToNow } from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export function PersonnelMonitor() {
    const { activeShifts, loading } = useActiveShifts()
    const { locale } = useTranslation()
    const L = (de: string, en: string) => (locale === 'de' ? de : en)
    const dateLocale = locale === 'de' ? deLocale : undefined

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Activity className="h-8 w-8 text-blue-600 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{L('Personalstatus wird synchronisiert…', 'Syncing Personnel Status...')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Live HUD Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-8 rounded-[2.5rem] bg-slate-900 border-none text-white relative overflow-hidden group shadow-2xl col-span-1 md:col-span-2">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                        <Activity className="w-48 h-48 text-blue-500" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400">{L('LIVE-PERSONALSTATUS', 'LIVE PERSONNEL STATUS')}</h3>
                        <div className="flex items-end gap-3 font-black tracking-tighter">
                            <span className="text-7xl leading-none">{activeShifts.length}</span>
                            <span className="text-2xl text-slate-400 pb-2 uppercase tracking-widest">{L('Aktiv', 'Active')}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-md">
                            {L(
                                'Echtzeit-Übersicht aller Mitarbeiter in aktiven einsatzkritischen Schichten.',
                                'Current synchronized view of all personnel engaged in mission-critical shifts.',
                            )}
                        </p>
                    </div>
                </Card>

                <Card className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{L('IM EINSATZ', 'ON MISSION')}</h3>
                        <div className="text-5xl font-black tracking-tighter text-emerald-600 leading-none">
                            {activeShifts.filter(s => !s.is_on_break).length}
                        </div>
                    </div>
                    <div className="pt-6 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{L('Einsatzkapazität', 'Operational Capacity')}</span>
                    </div>
                </Card>

                <Card className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-all">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{L('IN BEREITSCHAFT / PAUSE', 'ON STANDBY / BREAK')}</h3>
                        <div className="text-5xl font-black tracking-tighter text-amber-500 leading-none">
                            {activeShifts.filter(s => s.is_on_break).length}
                        </div>
                    </div>
                    <div className="pt-6 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm">
                            <Coffee className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{L('Ressourcenpuffer', 'Resource Buffer')}</span>
                    </div>
                </Card>
            </div>

            {/* Personnel Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-6">
                    <h2 className="text-[10px] font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.4em] leading-none">
                        {L('Personal-Monitor', 'Personnel Monitor Hub')}
                    </h2>
                    <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> {L('Live-Einsatzsynchronisation', 'Live Operational Sync')}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeShifts.map((shift) => (
                        <Card
                            key={shift.id}
                            className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all border-t-[6px] border-t-blue-600"
                        >
                            <div className="flex flex-col h-full space-y-8">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100 shadow-inner">
                                            <Users className="h-7 w-7" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                                                {shift.employee.full_name}
                                            </h4>
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none shadow-none h-4",
                                                shift.is_on_break ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                                            )}>
                                                {shift.is_on_break ? L('In Pause', 'On Break') : L('Im Einsatz', 'On Mission')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{L('Im Einsatz seit', 'Engaged For')}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 tabular-nums">
                                            {formatDistanceToNow(new Date(shift.start_time), { locale: dateLocale })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{L('Aktiver Einsatzort', 'Active Site')}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 truncate max-w-[140px]">
                                            {L('Zentrale', 'Operational Hub')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 flex gap-2">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 min-w-0 h-11 px-2 rounded-xl text-[9px] font-black uppercase tracking-tight text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-50 transition-all whitespace-nowrap truncate"
                                        title={L('Kontakt aufnehmen', 'Contact Agent')}
                                    >
                                        {L('Kontakt', 'Contact')}
                                    </Button>
                                    <Button
                                        className="flex-1 min-w-0 h-11 px-2 rounded-xl text-[9px] font-black uppercase tracking-tight bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-100 transition-all active:scale-95 whitespace-nowrap truncate"
                                        title={L('Prüfprotokoll anzeigen', 'View Audit')}
                                    >
                                        {L('Protokoll', 'Protocol')}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {activeShifts.length === 0 && (
                        <div className="col-span-full py-24 bg-slate-50/30 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
                            <div className="h-20 w-20 rounded-[2.5rem] bg-white flex items-center justify-center text-slate-200 shadow-sm">
                                <Activity className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-bold text-slate-900 tracking-tight">{L('Keine aktiven Einsätze', 'No Active Missions')}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 max-w-sm px-6">
                                    {L('Das Einsatzpersonal befindet sich aktuell im Bereitschaftsmodus.', 'Operational workforce is currently in standby mode.')}
                                </p>
                            </div>
                            <Button variant="ghost" className="font-black text-[10px] uppercase tracking-widest text-blue-600 gap-2">
                                {L('Tageseinsatzplan öffnen', 'Access Daily Deployment')} <ArrowRight className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
