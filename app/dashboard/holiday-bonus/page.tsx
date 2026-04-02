// app/dashboard/holiday-bonus/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Star, Plus, Download, Search, Gift, ChevronRight, User, Calendar, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { HolidayBonus, Profile } from '@/lib/types'
import { useHolidayBonus } from '@/hooks/useHolidayBonus'
import { HolidayBonusForm } from '@/components/shared/HolidayBonusForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

export default function HolidayBonusPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const { bonuses, loading, createHolidayBonus, deleteHolidayBonus, totalPaidThisYear } = useHolidayBonus()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, Profile>>({})

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
    <HolidayBonusForm 
      onSubmit={async (data) => {
        const success = await createHolidayBonus(data)
        if (success) setIsFormOpen(false)
        return success
      }}
      onCancel={() => setIsFormOpen(false)}
    />
  )

  if (isAdmin || isDispatcher) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 md:px-0 pt-4 md:pt-0">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
              {locale === 'en' ? 'Holiday Bonuses' : 'Boni'}
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Manage and distribute performance bonus payments.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-12 rounded-2xl px-6 font-bold border-gray-100 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 rounded-2xl px-6 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 gap-2 uppercase tracking-widest text-[10px]">
                  <Plus className="w-4 h-4" />
                  {locale === 'en' ? 'New Bonus' : 'Neuer Bonus'}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] p-8 sm:max-w-[500px]">
                 <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Award Holiday Bonus</DialogTitle>
                 </DialogHeader>
                 {renderForm()}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 md:px-0">
           <Card className="rounded-[3rem] border-none bg-[#0064E0] text-white overflow-hidden relative shadow-2xl shadow-blue-500/10 p-10 group">
             <Star className="absolute -right-4 -bottom-4 w-40 h-40 text-white/5 group-hover:scale-110 transition-transform duration-700" />
             <div className="relative z-10 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Total Paid This Year</p>
                <h4 className="text-6xl font-black tracking-tighter tabular-nums">{totalPaidThisYear.toLocaleString()}€</h4>
             </div>
           </Card>
           <Card className="rounded-[3rem] border-none bg-emerald-600 text-white overflow-hidden relative shadow-2xl shadow-emerald-500/10 p-10 group">
             <Gift className="absolute -right-4 -bottom-4 w-40 h-40 text-white/5 group-hover:scale-110 transition-transform duration-700" />
             <div className="relative z-10 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Total Distributions</p>
                <h4 className="text-6xl font-black tracking-tighter tabular-nums">{bonuses.length}</h4>
             </div>
           </Card>
        </div>

        <Card className="border-none md:border md:border-border/50 rounded-none md:rounded-[3rem] shadow-none md:shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-10 border-b border-gray-100 bg-gray-50/50">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search employees..." 
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0064E0]/10 transition-all font-bold text-sm"
                />
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Employee</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Bonus Description</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Amount</th>
                    <th className="text-left p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Date Paid</th>
                    <th className="text-right p-8 font-black text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [1, 2, 3].map(i => <tr key={i}><td colSpan={5} className="p-8 h-20 bg-gray-50/50 animate-pulse" /></tr>)
                  ) : bonuses.length > 0 ? bonuses.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                              <User className="w-6 h-6 text-gray-300" />
                           </div>
                           <span className="font-black text-gray-900">{employeeProfiles[b.employee_id]?.full_name || '...'}</span>
                        </div>
                      </td>
                      <td className="p-8 font-bold text-gray-400">{b.notes}</td>
                      <td className="p-8 font-black text-indigo-600 text-xl tabular-nums">{b.amount.toFixed(2)}€</td>
                      <td className="p-8 font-bold text-gray-400 uppercase tracking-tight text-xs">
                        {new Date(b.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE')}
                      </td>
                      <td className="p-8 text-right">
                         <Button 
                           variant="ghost" 
                           onClick={() => deleteHolidayBonus(b.id)}
                           className="rounded-xl h-12 px-4 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                         >
                           <Trash2 className="w-5 h-5" />
                         </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-gray-400 font-bold tracking-widest uppercase text-xs">No bonus distributions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Employee View
  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 pb-32 pt-4 px-6 md:px-0">
      <div className="space-y-1">
        <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
          {locale === 'en' ? 'My Bonuses' : 'Meine Boni'}
        </h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Performance rewards & extra payments</p>
      </div>

      <div className="space-y-6">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-[3rem]" />)
        ) : bonuses.length > 0 ? bonuses.map(b => (
          <Card key={b.id} className="rounded-[3rem] border-none bg-gradient-to-br from-[#0064E0] to-blue-700 text-white shadow-2xl shadow-blue-500/10 overflow-hidden p-10 relative group border-t border-white/10">
             <Star className="absolute bottom-4 right-4 w-40 h-40 text-white/5 opacity-50 transform translate-x-10 translate-y-10 group-hover:scale-110 transition-transform duration-700" />
             <div className="relative z-10 space-y-8">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{b.notes}</p>
                   <h4 className="text-6xl font-black tracking-tighter tabular-nums">{b.amount.toFixed(2)}€</h4>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/60 bg-white/5 w-fit px-4 py-2 rounded-xl">
                   <Calendar className="w-3.5 h-3.5" /> Paid on {new Date(b.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE')}
                </div>
             </div>
          </Card>
        ) ) : (
          <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No bonuses received yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
