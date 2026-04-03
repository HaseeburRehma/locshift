'use client'

import React, { useState, useEffect } from 'react'
import { Customer } from '@/lib/types'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet'
import { 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Clock, 
  Navigation, 
  FileText, 
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCustomers } from '@/hooks/useCustomers'
import { cn } from '@/lib/utils'

interface CustomerDetailsProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (customer: Customer) => void
}

export function CustomerDetails({ customer, open, onOpenChange, onEdit }: CustomerDetailsProps) {
  const { getCustomerStats } = useCustomers()
  const [stats, setStats] = useState({ totalShifts: 0, totalHours: 0 })
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    if (customer && open) {
      setLoadingStats(true)
      getCustomerStats(customer.id).then(res => {
        setStats(res)
        setLoadingStats(false)
      })
    }
  }, [customer, open])

  if (!customer) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 border-l border-slate-100 shadow-2xl overflow-y-auto scrollbar-hide">
        {/* Header Hero Area */}
        <div className="bg-slate-50 p-8 pt-12 space-y-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <Navigation className="w-40 h-40 text-blue-600 rotate-12" />
           </div>
           
           <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100">
                    <span className="text-2xl font-black">{customer.name.substring(0, 2).toUpperCase()}</span>
                 </div>
                 <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => onEdit(customer)}
                    className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                 >
                    <Edit3 className="w-4 h-4 text-slate-400" />
                 </Button>
              </div>

              <div className="space-y-1.5">
                 <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none">{customer.name}</h2>
                 <div className={cn(
                    "flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg w-fit mt-3",
                    customer.is_active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                 )}>
                    {customer.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {customer.is_active ? 'Status: Active Mission' : 'Status: Inactive'}
                 </div>
              </div>
           </div>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-10 pb-32">
           {/* Section: Stats Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-2 group hover:border-blue-200 transition-all">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL SHIFTS</p>
                 <h3 className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                    {loadingStats ? '...' : stats.totalShifts}
                 </h3>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-2 group hover:border-emerald-200 transition-all">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL HOURS</p>
                 <h3 className="text-2xl font-black text-emerald-600 tabular-nums leading-none">
                    {loadingStats ? '...' : stats.totalHours.toFixed(1)}
                    <span className="text-xs ml-0.5 opacity-60">h</span>
                 </h3>
              </div>
           </div>

           {/* Section: Contact Details */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Information</h3>
              <div className="space-y-6">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                       <MapPin className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Operational Address</p>
                       <p className="text-sm font-bold text-slate-900 leading-relaxed max-w-[200px]">{customer.address || 'No Address Logged'}</p>
                       {customer.address && (
                          <a href={`https://maps.google.com/?q=${encodeURIComponent(customer.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 hover:underline">
                             View on Map <ExternalLink className="w-3 h-3" />
                          </a>
                       )}
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                       <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Key Contact Person</p>
                       <p className="text-sm font-bold text-slate-900">{customer.contact_person || 'Undefined'}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                       <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Primary Email</p>
                       <p className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">{customer.email || 'No Email Logged'}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                       <Phone className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Secondary Contact</p>
                       <p className="text-sm font-bold text-slate-900">{customer.phone || 'No Phone Logged'}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Section: Operational Notes */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <FileText className="w-4 h-4" /> Operational Notes
              </h3>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 italic">
                 <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                    {customer.notes || 'No mission-specific notes recorded for this customer account.'}
                 </p>
              </div>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
