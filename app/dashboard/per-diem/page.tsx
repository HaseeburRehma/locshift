// app/dashboard/per-diem/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, Plus, Filter, Search, MapPin, Calendar, Clock, ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { PerDiem, Profile } from '@/lib/types'
import { usePerDiem } from '@/hooks/usePerDiem'
import { PerDiemForm } from '@/components/shared/PerDiemForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function PerDiemPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const { perDiems, loading, createPerDiem, updatePerDiemStatus } = usePerDiem()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, Profile>>({})

  // Fetch employee profiles for names in admin list
  useEffect(() => {
     const fetchProfiles = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('profiles').select('*').eq('organization_id', profile?.organization_id)
        if (data) {
           const map = data.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
           setEmployeeProfiles(map)
        }
     }
     if (isAdmin || isDispatcher) fetchProfiles()
  }, [isAdmin, isDispatcher, profile?.organization_id])

  const renderForm = () => (
    <PerDiemForm 
       onSubmit={async (data) => {
         const success = await createPerDiem(data)
         if (success) setIsFormOpen(false)
         return success
       }}
       onCancel={() => setIsFormOpen(false)}
    />
  )

  if (isAdmin || isDispatcher) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 md:px-0">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
              {locale === 'en' ? 'Per Diems' : 'Verpflegung'}
            </h2>
            <p className="text-muted-foreground font-medium text-xs uppercase tracking-widest opacity-60">Review and approve travel allowance requests.</p>
          </div>
          <Button variant="outline" className="h-12 rounded-2xl px-6 font-bold border-gray-200">
            {locale === 'en' ? 'Export for Payroll' : 'Lohnexport'}
          </Button>
        </div>

        <Card className="border-none md:border md:border-border/50 rounded-none md:rounded-[2.5rem] shadow-none md:shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-gray-100 bg-gray-50/50">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="Search employees..." 
                     className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                   />
                </div>
                <Button variant="outline" className="h-11 rounded-xl border-gray-200 gap-2 font-black text-[10px] uppercase tracking-widest">
                  <Filter className="w-4 h-4" /> All Status
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 space-y-4">
                   {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-2xl" />)}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Employee</th>
                      <th className="text-left p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Date</th>
                      <th className="text-left p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Country</th>
                      <th className="text-left p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Amount</th>
                      <th className="text-left p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                      <th className="text-right p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {perDiems.length > 0 ? perDiems.map(pd => (
                      <tr key={pd.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-6 font-bold text-gray-900">{employeeProfiles[pd.employee_id]?.full_name || '...'}</td>
                        <td className="p-6 font-semibold text-gray-500">
                           {new Date(pd.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE')}
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-1.5 font-medium text-gray-700">
                             <MapPin className="w-3.5 h-3.5 text-gray-300" />
                             {pd.country}
                          </div>
                        </td>
                        <td className="p-6">
                           <span className="font-black text-gray-900 text-lg">{pd.amount.toFixed(2)}€</span>
                        </td>
                        <td className="p-6">
                           <StatusBadge status={pd.status} />
                        </td>
                        <td className="p-6 text-right">
                           {pd.status === 'submitted' && (
                             <div className="flex gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  onClick={() => updatePerDiemStatus(pd.id, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => updatePerDiemStatus(pd.id, 'rejected')}
                                  className="text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs"
                                >
                                  Reject
                                </Button>
                             </div>
                           )}
                        </td>
                      </tr>
                    )) : (
                       <tr>
                         <td colSpan={6} className="p-20 text-center text-gray-400 font-bold tracking-widest uppercase text-xs">No claims found</td>
                       </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Employee View
  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 pb-32 pt-4">
      <div className="flex items-center justify-between px-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
            {locale === 'en' ? 'Allowance' : 'Verpflegung'}
          </h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Meal allowance & Expenses history</p>
        </div>
        
        {isDesktop ? (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 rounded-2xl bg-[#0064E0] shadow-lg shadow-blue-500/20 gap-2 px-6 font-bold uppercase tracking-widest text-[10px]">
                <Plus className="w-4 h-4" /> New Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 sm:max-w-[500px]">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Submit Per Diem</DialogTitle>
               </DialogHeader>
               {renderForm()}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DrawerTrigger asChild>
              <Button className="w-14 h-14 rounded-[1.25rem] bg-[#0064E0] shadow-xl shadow-blue-500/30 p-0 text-white">
                <Plus className="w-6 h-6" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[3rem] p-8 pb-12">
               <DrawerHeader className="px-0">
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic leading-tight">Submit Travel Claim</DialogTitle>
               </DrawerHeader>
               <div className="pt-4">
                  {renderForm()}
               </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>

      <div className="px-6 space-y-4">
        {loading ? (
             [1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-[2rem]" />)
        ) : perDiems.length > 0 ? perDiems.map(pd => (
          <div key={pd.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-50 flex items-center justify-between hover:shadow-2xl hover:shadow-blue-50 transition-all duration-300 group">
             <div className="flex gap-6 items-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0 text-[#0064E0] group-hover:scale-110 transition-transform duration-500">
                   <Wallet className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                   <div className="flex items-center gap-3">
                     <p className="text-2xl font-black text-gray-900 tracking-tighter">{pd.amount.toFixed(2)}€</p>
                     <StatusBadge status={pd.status} dotOnly />
                   </div>
                   <div className="flex items-center gap-2">
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                       <Calendar className="w-3 h-3" /> {new Date(pd.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { day: '2-digit', month: 'short' })}
                     </p>
                     <span className="w-1 h-1 rounded-full bg-gray-200" />
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                       <MapPin className="w-3 h-3" /> {pd.country}
                     </p>
                   </div>
                </div>
             </div>
             <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
                <ChevronRight className="w-5 h-5 text-gray-300" />
             </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No travel claims recorded</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, dotOnly }: { status: string, dotOnly?: boolean }) {
  const styles: any = {
    submitted: "text-orange-600 bg-orange-50 border-orange-100",
    approved: "text-emerald-600 bg-emerald-50 border-emerald-100",
    rejected: "text-red-600 bg-red-50 border-red-100"
  }

  const icons: any = {
    submitted: <AlertCircle className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />
  }

  if (dotOnly) {
     return (
       <div className={cn(
         "w-3 h-3 rounded-full shadow-inner border border-white/50",
         status === 'approved' ? "bg-emerald-500 shadow-emerald-200" : status === 'rejected' ? "bg-red-500 shadow-red-200" : "bg-orange-500 animate-pulse shadow-orange-200"
       )} />
     )
  }

  return (
    <div className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-full border w-fit shadow-sm", styles[status])}>
      {icons[status]}
      <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
    </div>
  )
}
