'use client'

import React from 'react'
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Activity, 
  PlayCircle, 
  Loader2,
  ChevronRight
} from 'lucide-react'
import { ClockInOutCard } from '@/components/time/ClockInOutCard'
import { PersonnelMonitor } from '@/components/dashboard/PersonnelMonitor'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useUser } from '@/lib/user-context'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

export default function LiveShiftPage() {
  const { role, isAdmin, isDispatcher } = useUser()
  const { activeEntry, todayPlans, loading } = useTimeTracking()
  const { locale } = useTranslation()
  const L = (deStr: string, en: string) => (locale === 'de' ? deStr : en)
  
  const activePlan = todayPlans.find(p => p.id === activeEntry?.plan_id) || todayPlans[0]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{L('Einsatz-HUD wird synchronisiert…', 'Syncing Operational HUD...')}</p>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ADMIN / DISPATCHER VIEW: PERSONNEL MONITOR (Section 4.1 & 4.2)
  // ──────────────────────────────────────────────────────────────────────────
  if (isAdmin || isDispatcher) {
    return <PersonnelMonitor />
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. EMPLOYEE VIEW: MISSION CLOCK-IN (Section 4.3)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 md:px-0">
        <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none flex items-center gap-4">
               <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                  <Activity className="h-6 w-6" />
               </div>
               {L('Live-Einsatz', 'Live Mission')}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{L('Einsatzzentrale in Echtzeit', 'Real-time operational center')}</p>
        </div>
        <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase tracking-widest border border-blue-100/50">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Left: Clock In Widget (Wider for mobile accessibility) */}
        <div className="lg:col-span-2 px-4 md:px-0">
          <ClockInOutCard />
        </div>

        {/* Right: Mission Details */}
        <div className="lg:col-span-3 px-4 md:px-0 space-y-10">
          {!activePlan ? (
            <div className="text-center py-24 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-6">
              <div className="h-16 w-16 rounded-[2rem] bg-white flex items-center justify-center text-slate-200 shadow-sm">
                 <Navigation className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                 <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">{L('Heute kein geplanter Einsatz', 'No Scheduled Mission Today')}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                   {L('Sehen Sie im Einsatzkalender kommende Einsätze ein.', 'Check your operational calendar for future deployment details.')}
                 </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 shadow-[0_32px_64px_-16px_rgba(37,99,235,0.08)] rounded-[3rem] p-10 space-y-10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/30 rounded-bl-[6rem] -z-0 transition-all group-hover:scale-110" />

               <div className="relative z-10 space-y-8">
                 <div className="flex items-center justify-between">
                    <Badge className={cn(
                      "font-black text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm border-none leading-none h-6",
                      activeEntry ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {activeEntry ? (activeEntry.is_on_break ? L('In Bereitschaft', 'On Standby') : L('Einsatz aktiv', 'Mission Active')) : L('Einsatzbereit', 'Mission Ready')}
                    </Badge>
                 </div>

                 <div className="flex gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-slate-100 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-blue-50 transition-colors">
                      <Navigation className="text-blue-600 w-8 h-8 group-hover:rotate-12 transition-transform duration-500" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-3xl tracking-tighter leading-none">
                        {activePlan.route || L('Einsatzzentrale', 'Operational Hub')}
                      </h3>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" /> 
                            {format(new Date(activePlan.start_time), 'HH:mm')} – {format(new Date(activePlan.end_time), 'HH:mm')}
                         </div>
                         <div className="h-1 w-1 rounded-full bg-slate-200" />
                         <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{L('Einsatz-ID', 'Mission ID')}: {activePlan.id.slice(0, 8)}</span>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="h-px bg-slate-50 w-full" />

               <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-blue-600 group-hover/item:bg-blue-50 transition-all border border-slate-50">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{L('Aktueller Einsatzort', 'Current Work Site')}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{activePlan.location || L('Hauptzentrale', 'Main Deployment Center')}</span>
                  </div>

                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:text-blue-600 group-hover/item:bg-blue-50 transition-all border border-slate-50">
                        <PlayCircle className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{L('Einsatzstatus', 'Assignment Context')}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight uppercase">{activePlan.status} {L('Einsatzbereit', 'Operational')}</span>
                  </div>
               </div>

               <div className="pt-4 flex gap-4">
                  <Button className="flex-1 h-16 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 group">
                    {L('Einsatzauswertung', 'Mission Analytics')} <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
               </div>
            </div>
          )}

          {/* Guidelines Mini-Card */}
          <div className="p-10 bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-slate-800">
             <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                <Navigation className="w-32 h-32 text-blue-500" />
             </div>
             <div className="relative z-10 space-y-4">
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] leading-none">{L('Einsatzvorgaben', 'Operational Directives')}</h4>
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-[85%] italic">
                  {L(
                    'Der Einsatzabschluss erfordert die Bestätigung aller organisatorischen Kontrollpunkte. Pausen werden live von der Disposition überwacht.',
                    'Mission completion mandates verification of all organizational checkpoints. Break durations are live-monitored by dispatch.',
                  )}
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
