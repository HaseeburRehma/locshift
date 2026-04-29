// app/dashboard/customers/page.tsx
'use client'

import React, { useState } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  MoreHorizontal, 
  User, 
  ShieldCheck, 
  Filter, 
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { Customer } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { useCustomers } from '@/hooks/useCustomers'
import { toast } from 'sonner'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { CustomerDetails } from '@/components/customers/CustomerDetails'
import { cn } from '@/lib/utils'

export default function CustomersPage() {
  const { isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const { customers, loading, deleteCustomer, toggleStatus } = useCustomers()
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedCustomer(null)
    setIsFormOpen(true)
  }

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDetailsOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(locale === 'en' ? `Permanently remove ${name}?` : `${name} endgültig entfernen?`)) return
    try {
      await deleteCustomer(id)
      toast.success(locale === 'de' ? 'Kundenprofil entfernt' : 'Customer profile removed')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterStatus === 'active') return matchesSearch && c.is_active
    if (filterStatus === 'inactive') return matchesSearch && !c.is_active
    return matchesSearch
  })

  // Employees can view the list but not perform CRUD
  const canManage = isAdmin || isDispatcher

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
           <div className="h-10 w-64 bg-slate-100 rounded-xl" />
           <div className="h-12 w-40 bg-slate-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-50 rounded-2xl border border-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/40 md:bg-transparent pb-32">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] leading-none mb-1 block">
              {locale === 'en' ? 'Operational CRM' : 'Betriebs-CRM'}
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-[#0064E0] leading-none">
              {locale === 'en' ? 'Customer Management' : 'Kundenverwaltung'}
            </h2>
            <p className="text-sm font-bold text-slate-400 capitalize tracking-tight flex items-center gap-2">
               {locale === 'en' ? 'Organize project sites & client contacts' : 'Einsatzorte und Kundenkontakte verwalten'}
            </p>
          </div>
          
          {canManage && (
             <Button 
                onClick={handleAdd}
                className="h-12 rounded-xl px-8 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-100 bg-blue-600 hover:bg-blue-700 gap-3"
             >
               <Plus className="w-5 h-5 stroke-[3]" />
               {locale === 'en' ? 'Register Account' : 'Kunde anlegen'}
             </Button>
          )}
        </div>

        {/* Filters HUD */}
        <Card className="border-slate-200/60 rounded-2xl shadow-sm bg-white overflow-hidden">
           <div className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder={locale === 'en' ? "Search by name, contact or email..." : "Kunden suchen..."}
                  className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-sm text-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                 <FilterButton active={filterStatus === 'all'} label={locale === 'en' ? 'All' : 'Alle'} onClick={() => setFilterStatus('all')} />
                 <FilterButton active={filterStatus === 'active'} label={locale === 'en' ? 'Active' : 'Aktiv'} onClick={() => setFilterStatus('active')} />
                 <FilterButton active={filterStatus === 'inactive'} label={locale === 'en' ? 'Inactive' : 'Inaktiv'} onClick={() => setFilterStatus('inactive')} />
              </div>
           </div>
        </Card>

        {/* CUSTOMERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
            <Card 
               key={customer.id} 
               onClick={() => handleViewDetails(customer)}
               className={cn(
                 "border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer bg-white group relative",
                 !customer.is_active && "bg-slate-50/50 border-dashed"
               )}
            >
               {/* Context Actions */}
               {canManage && (
                  <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-slate-100">
                             <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-2xl p-2 w-40">
                          <DropdownMenuItem className="rounded-lg font-bold text-[11px] uppercase tracking-widest py-2.5 cursor-pointer" onClick={() => handleEdit(customer)}>
                            {locale === 'en' ? 'Edit' : 'Bearbeiten'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                             className={cn("rounded-lg font-bold text-[11px] uppercase tracking-widest py-2.5 cursor-pointer", customer.is_active ? "text-amber-600" : "text-emerald-600")}
                             onClick={() => toggleStatus(customer.id, customer.is_active)}
                          >
                            {customer.is_active ? (locale === 'en' ? 'Deactivate' : 'Deaktivieren') : (locale === 'en' ? 'Activate' : 'Aktivieren')}
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-50 my-1" />
                          <DropdownMenuItem className="rounded-lg font-bold text-[11px] uppercase tracking-widest py-2.5 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(customer.id, customer.name)}>
                            {locale === 'en' ? 'Remove Record' : 'Datensatz entfernen'}
                          </DropdownMenuItem>
                       </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
               )}

               <div className={cn("p-6 space-y-6", !customer.is_active && "opacity-60")}>
                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                        <Users className="w-6 h-6" />
                     </div>
                     <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                           <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none truncate">{customer.name}</h3>
                           <ChevronRight className="w-4 h-4 text-slate-200 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className={cn(
                           "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-[0.2em] leading-none w-fit",
                           customer.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-200/50 text-slate-400 border-slate-200"
                        )}>
                           <div className={cn("w-1 h-1 rounded-full", customer.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                           {customer.is_active
                             ? (locale === 'en' ? 'ACTIVE ACCOUNT' : 'AKTIVER KUNDE')
                             : (locale === 'en' ? 'INACTIVE' : 'INAKTIV')}
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid gap-3 pt-2">
                     <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-slate-300" />
                        <p className="text-xs font-bold text-slate-500 truncate">{customer.address || (locale === 'en' ? 'Location Unspecified' : 'Adresse unbekannt')}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-300" />
                        <p className="text-xs font-black text-slate-700 tracking-tight">{customer.contact_person || (locale === 'en' ? 'No Lead Contact' : 'Kein Ansprechpartner')}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-300" />
                        <p className="text-xs font-bold text-blue-600 truncate">{customer.email || (locale === 'en' ? 'No Primary Email' : 'Keine E-Mail hinterlegt')}</p>
                     </div>
                  </div>
               </div>
            </Card>
          )) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6 opacity-40">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 border-dashed">
                  <Users className="w-10 h-10 text-slate-300" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{locale === 'en' ? 'No customers matched your search' : 'Keine Kunden für Ihre Suche gefunden'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Side HUDs & Forms */}
      <CustomerDetails 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
        customer={selectedCustomer} 
        onEdit={(customer) => {
          setIsDetailsOpen(false)
          handleEdit(customer)
        }}
      />
      <CustomerForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        customer={selectedCustomer || undefined}
        onSuccess={() => {}}
      />
    </div>
  )
}

function FilterButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
        active ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  )
}
