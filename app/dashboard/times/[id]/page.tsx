// app/dashboard/times/[id]/page.tsx
'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Edit2, CheckCircle2, MapPin, Clock, FileText, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { useTimeEntries } from '@/hooks/times/useTimeEntries'
import { useTimeMutations } from '@/hooks/times/useTimeMutations'
import { StatusBadge } from '@/components/times/StatusBadge'
import { format } from 'date-fns'

export default function TimeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { locale } = useTranslation()
  const { isAdmin, isDispatcher, profile } = useUser()
  const entryId = params.id as string
  const { entries, loading } = useTimeEntries('all')
  const { verifyTimeEntry, isSubmitting } = useTimeMutations()

  // Find the specific entry
  const entry = entries.find(e => e.id === entryId)

  if (loading) {
    return (
      <div className="space-y-12 animate-pulse px-6 pt-4">
        <div className="h-10 w-48 bg-gray-100 rounded-xl" />
        <div className="h-96 bg-gray-50 rounded-[3rem]" />
      </div>
    )
  }

  if (!entry) {
    return <div className="p-12 text-center text-gray-400 font-bold tracking-widest uppercase">Entry not found</div>
  }

  const isOwner = profile?.id === entry.employee_id
  const canEdit = isOwner && !entry.is_verified
  const canVerify = (isAdmin || isDispatcher) && !entry.is_verified
  const status = entry.is_verified ? 'approved' : 'pending'
  const netHoursFormatted = parseFloat((entry.net_hours || 0).toString()).toFixed(1)

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-700 pb-32">
      {/* Navigation Header */}
      <div className="px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon-lg" 
            onClick={() => router.back()}
            className="rounded-2xl hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
            Time Details
          </h2>
        </div>
        {canEdit && (
          <Button variant="ghost" size="icon-lg" className="rounded-2xl bg-blue-50 text-blue-600">
            <Edit2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main Focus Card */}
      <div className="px-6">
        <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-2xl shadow-blue-500/5 text-center flex flex-col items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-blue-600 opacity-5 transform translate-x-8 -translate-y-8">
            <Clock className="w-40 h-40" />
          </div>

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Duration</span>
            <h1 className="text-6xl font-black text-[#0064E0] tracking-tighter tabular-nums leading-none">
              {netHoursFormatted} hrs
            </h1>
          </div>
          
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Detailed Grid */}
      <div className="px-6 space-y-8 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-gray-100 rounded-3xl p-8">
           <DetailRow icon={Clock} label="Start Time" value={format(new Date(entry.start_time), 'HH:mm')} />
           <DetailRow icon={Clock} label="End Time" value={format(new Date(entry.end_time), 'HH:mm')} />
           <DetailRow icon={Clock} label="Break" value={`${entry.break_minutes} mins`} />
           <DetailRow icon={User} label="Customer" value={entry.customer?.name || '---'} />
           <DetailRow icon={MapPin} label="Location" value={entry.location || 'Not specified'} />
           {entry.is_verified && (
             <DetailRow icon={CheckCircle2} label="Approved By" value={entry.verifier?.full_name || 'System Auto'} />
           )}
        </div>

        {/* Notes Area */}
        {entry.notes && (
          <div className="space-y-3">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3" /> Notes
             </h4>
             <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl text-sm font-bold text-gray-600">
                {entry.notes}
             </div>
          </div>
        )}

        {/* Admin Verify Action */}
        {canVerify && (
          <div className="pt-6">
            <Button 
              onClick={() => verifyTimeEntry(entry.id)}
              className="w-full h-16 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/20"
            >
              Verify This Entry
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4">
       <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
          <Icon className="w-5 h-5 text-gray-400" />
       </div>
       <div className="space-y-0.5">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          <p className="font-bold text-gray-900">{value}</p>
       </div>
    </div>
  )
}
