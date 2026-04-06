// app/dashboard/per-diem/page.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Wallet, 
  Plus, 
  Filter, 
  Search, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  ArrowLeft,
  Download,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { PerDiem, Profile } from '@/lib/types'
import { usePerDiem } from '@/hooks/usePerDiem'
import { PerDiemForm } from '@/components/shared/PerDiemForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, isSameMonth, parseISO } from 'date-fns'
import { toast } from 'sonner'

type StatusFilter = 'all' | 'pending' | 'approved'

export default function PerDiemPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const { perDiems, loading, createPerDiem, updatePerDiemStatus } = usePerDiem()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, Profile>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch employee profiles for names in admin list
  useEffect(() => {
     const fetchProfiles = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('profiles').select('*').eq('organization_id', profile?.organization_id)
        if (data) {
           const map = data.reduce((acc: Record<string, Profile>, p: Profile) => ({ ...acc, [p.id]: p }), {})
           setEmployeeProfiles(map)
        }
     }
     if (isAdmin || isDispatcher) fetchProfiles()
  }, [isAdmin, isDispatcher, profile?.organization_id])

  const filteredPerDiems = useMemo(() => {
    return perDiems.filter(pd => {
      const matchesStatus = statusFilter === 'all' || pd.status === (statusFilter === 'pending' ? 'submitted' : statusFilter)
      const employeeName = employeeProfiles[pd.employee_id]?.full_name?.toLowerCase() || ''
      const matchesSearch = employeeName.includes(searchQuery.toLowerCase()) || pd.task?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [perDiems, statusFilter, searchQuery, employeeProfiles])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = perDiems.filter(pd => isSameMonth(parseISO(pd.date), now))
    const totalAmount = thisMonth.filter(pd => pd.status === 'approved').reduce((acc: number, curr: PerDiem) => acc + (Number(curr.amount) || 0), 0)
    const pendingCount = perDiems.filter(pd => pd.status === 'submitted').length
    return { totalAmount, pendingCount }
  }, [perDiems])

  const handleExport = () => {
    const headers = ['Employee', 'Date', 'Task', 'Country', 'Amount', 'Status']
    const rows = filteredPerDiems.map(pd => [
      employeeProfiles[pd.employee_id]?.full_name || 'Unknown',
      pd.date,
      pd.task || 'N/A',
      pd.country,
      pd.amount.toFixed(2),
      pd.status
    ])
    
    const csvContent = [headers, ...rows].map((e: string[]) => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `per_diems_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Export started')
  }

  const renderForm = () => (
    <PerDiemForm 
       onSubmit={async (data) => {
         const success = await createPerDiem(data)
         if (success) setIsFormOpen(false)
         return !!success
       }}
       onCancel={() => setIsFormOpen(false)}
    />
  )

  if (isAdmin || isDispatcher) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 md:px-6 md:py-8 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 md:px-0">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">
              Per Diems
            </h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] opacity-80">Review and approve travel allowance requests.</p>
          </div>
          <Button 
            onClick={handleExport}
            variant="outline" 
            className="h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-xs border-2 border-slate-100 hover:bg-slate-50 transition-all gap-3 shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" /> Export for Payroll
          </Button>
        </div>

        <div className="bg-white md:rounded-[3rem] md:shadow-2xl md:shadow-slate-100/50 md:border md:border-slate-100 overflow-hidden">
          <div className="p-8 md:p-10 border-b border-slate-50 bg-slate-50/30">
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="relative w-full max-w-xl">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                   <input 
                     type="text" 
                     placeholder="Search employees or tasks..." 
                     value={searchQuery}
                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                     className="w-full h-14 pl-14 pr-6 rounded-2xl border-2 border-slate-100 bg-white focus:outline-none focus:border-blue-500/20 transition-all font-bold text-gray-700 shadow-sm"
                   />
                </div>
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved'] as StatusFilter[]).map((status) => (
                    <Button 
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      className={cn(
                        "h-14 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                        statusFilter === status ? "bg-slate-900 text-white" : "border-2 border-slate-100 text-gray-400 hover:bg-slate-50"
                      )}
                    >
                      {status === 'all' && <Filter className="w-3.5 h-3.5 mr-2" />}
                      {status} Status
                    </Button>
                  ))}
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="p-12 space-y-6">
                 {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-50/50 animate-pulse rounded-[2rem]" />)}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Employee</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Date / Range</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Country</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Amount</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                    <th className="text-right p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPerDiems.length > 0 ? filteredPerDiems.map(pd => (
                    <tr key={pd.id} className="hover:bg-slate-50/30 transition-all duration-300 group">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200">
                            {employeeProfiles[pd.employee_id]?.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 leading-none mb-1">{employeeProfiles[pd.employee_id]?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                              {pd.plan?.customer?.name ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                  Mission: {pd.plan.customer.name}
                                </>
                              ) : (
                                pd.task || 'General Travel'
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="space-y-1">
                          <p className="font-bold text-gray-700">
                             {pd.start_date ? `${format(parseISO(pd.start_date), 'dd.MM')} - ${format(parseISO(pd.end_date || pd.start_date), 'dd.MM.yyyy')}` : format(parseISO(pd.date), 'dd.MM.yyyy')}
                          </p>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {pd.working_hours ? `${pd.working_hours} Hours Total` : `${pd.num_days || 1} Days Total`}
                          </p>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-2 font-bold text-gray-600">
                           <MapPin className="w-4 h-4 text-blue-500/50" />
                           {pd.country}
                        </div>
                      </td>
                      <td className="p-8">
                         <p className="font-black text-gray-900 text-xl tracking-tighter">€{pd.amount.toFixed(2)}</p>
                      </td>
                      <td className="p-8">
                         <StatusBadge status={pd.status} />
                      </td>
                      <td className="p-8 text-right">
                         <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            {pd.status === 'submitted' ? (
                              <>
                                <Button 
                                  onClick={() => updatePerDiemStatus(pd.id, 'approved')}
                                  className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                >
                                  Approve
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => updatePerDiemStatus(pd.id, 'rejected')}
                                  className="h-10 rounded-xl text-red-500 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest"
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="icon" className="rounded-xl text-slate-300">
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            )}
                         </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-32 text-center">
                         <div className="flex flex-col items-center gap-4 opacity-30">
                           <Wallet className="w-16 h-16 text-slate-400" />
                           <p className="font-black tracking-widest uppercase text-xs">No per diem claims found</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Employee View (Mobile-First)
  return (
    <div className="min-h-screen bg-[#FAFBFF] animate-in slide-in-from-bottom-6 duration-700 pb-32">
       {/* Header */}
       <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 px-6 py-6 border-b border-slate-50 flex items-center justify-between">
         <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center bg-white shadow-sm">
           <ArrowLeft className="w-5 h-5 text-blue-600" />
         </div>
         <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">Per Diem</h1>
         <div className="w-10" />
       </div>

       <div className="p-6 space-y-8 max-w-5xl mx-auto">
         {/* Filter Pills */}
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {(['all', 'pending', 'approved'] as StatusFilter[]).map((status) => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shrink-0 shadow-sm",
                  statusFilter === status 
                    ? "bg-[#0064E0] text-white shadow-blue-500/30" 
                    : "bg-white text-gray-400 border border-slate-100"
                )}
              >
                {status}
              </button>
            ))}
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0064E0] p-6 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/30 space-y-2">
               <p className="text-[28px] font-black tracking-tight leading-none italic">€{stats.totalAmount.toFixed(2)}</p>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total This Month</p>
            </div>
            <div className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-sm space-y-2">
               <p className="text-[28px] font-black tracking-tight leading-none italic text-blue-600">{stats.pendingCount}</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Claims</p>
            </div>
         </div>

         {/* Claims List */}
         <div className="space-y-6">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-44 bg-white border border-slate-50 animate-pulse rounded-[2.5rem] shadow-sm" />)
            ) : filteredPerDiems.length > 0 ? filteredPerDiems.map(pd => (
              <div key={pd.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 space-y-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter italics">
                    {pd.start_date ? `${format(parseISO(pd.start_date), 'MMM dd')} - ${format(parseISO(pd.end_date || pd.start_date), 'dd, yyyy')}` : format(parseISO(pd.date), 'MMM dd, yyyy')}
                  </h3>
                  <StatusBadge status={pd.status} />
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mission / Job</p>
                       <p className="text-sm font-bold text-gray-700 truncate max-w-[120px]">
                         {pd.plan?.customer?.name || pd.task || 'Building Cleaning'}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         {pd.working_hours ? 'Working Hours' : 'Days'}
                       </p>
                       <p className="text-sm font-bold text-gray-700">
                         {pd.working_hours ? `${pd.working_hours} Hours` : `${pd.num_days || 1} Days`}
                       </p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</p>
                       <p className="text-sm font-bold text-gray-700">
                         €{pd.working_hours ? `${pd.hourly_rate?.toFixed(2)}/h` : `${pd.rate?.toFixed(2)}/d`}
                       </p>
                    </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-[#0064E0]">Total Amount</p>
                      <p className="text-lg font-black text-[#0064E0]">€{pd.amount.toFixed(2)}</p>
                   </div>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-12 bg-blue-500 rounded-l-full opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            )) : (
              <div className="py-20 text-center space-y-4">
                 <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                    <Wallet className="w-8 h-8 text-slate-200" />
                 </div>
                 <p className="text-xs font-black uppercase tracking-widest text-slate-300">No travel allowance recorded yet</p>
              </div>
            )}
         </div>
       </div>

       {/* Floating Action Button */}
       <div className="fixed bottom-32 right-6 z-30">
          {isDesktop ? (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="w-16 h-16 rounded-[2rem] bg-[#0064E0] shadow-2xl shadow-blue-500/40 hover:scale-110 active:scale-90 transition-all group">
                  <Plus className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl p-8 sm:max-w-xl border-none shadow-2xl bg-white outline-none">
                 <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                       New Per Diem
                    </DialogTitle>
                 </DialogHeader>
                 {renderForm()}
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DrawerTrigger asChild>
                <Button className="w-16 h-16 rounded-[2rem] bg-[#0064E0] shadow-2xl shadow-blue-500/40 active:scale-90 transition-all">
                  <Plus className="w-8 h-8 text-white" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="rounded-t-[3.5rem] p-8 pb-12 outline-none">
                 <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                 <DrawerHeader className="px-0 pt-0 text-left mb-6">
                    <DrawerTitle className="text-4xl font-black uppercase italic tracking-tighter leading-none">New Per Diem</DrawerTitle>
                 </DrawerHeader>
                 <div className="overflow-y-auto max-h-[75vh] no-scrollbar">
                    {renderForm()}
                 </div>
              </DrawerContent>
            </Drawer>
          )}
       </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    submitted: "text-amber-600 bg-amber-400 shadow-[0_2px_10px_rgba(251,191,36,0.2)]",
    approved: "text-white bg-[#00C271] shadow-[0_2px_10px_rgba(0,194,113,0.2)]",
    rejected: "text-white bg-[#FF3B3B] shadow-[0_2px_10px_rgba(255,59,59,0.2)]"
  }

  const label: any = {
    submitted: "Pending",
    approved: "Approved",
    rejected: "Rejected"
  }

  return (
    <div className={cn("px-3 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] shadow-sm", styles[status])}>
      {label[status]}
    </div>
  )
}
