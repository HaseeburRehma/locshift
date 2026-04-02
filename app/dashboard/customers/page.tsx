// app/dashboard/customers/page.tsx
'use client'

import React, { useState } from 'react'
import { Users, Plus, Search, MapPin, Phone, Mail, MoreHorizontal, User, ShieldCheck } from 'lucide-react'
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
import { PlusCircle, Trash2 } from 'lucide-react'

export default function CustomersPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const { customers, loading, deleteCustomer } = useCustomers()

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(locale === 'en' ? `Are you sure you want to delete ${name}?` : `Möchten Sie ${name} wirklich löschen?`)) return
    try {
      await deleteCustomer(id)
      toast.success(locale === 'en' ? 'Customer deleted' : 'Kunde gelöscht')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAdmin && !isDispatcher) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <ShieldCheck className="w-16 h-16 text-gray-200" />
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500 font-medium">Only administrators and dispatchers can manage customers.</p>
       </div>
     )
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse px-4 pt-4">
        <div className="h-10 w-64 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-50 rounded-[2.5rem]" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            {locale === 'en' ? 'Customer Management' : 'Kundenverwaltung'}
          </h2>
          <p className="text-muted-foreground font-medium">Manage your client contacts and project locations.</p>
        </div>
        <Button className="h-12 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20 gap-2">
          <Plus className="w-5 h-5" />
          {locale === 'en' ? 'Add Customer' : 'Kunde anlegen'}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder={locale === 'en' ? "Search customers..." : "Kunden suchen..."}
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
          <Card key={customer.id} className="border-border/50 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all bg-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6">
                <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100">
                         <MoreHorizontal className="w-5 h-5 text-gray-400" />
                      </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-48">
                      <DropdownMenuItem className="rounded-xl font-bold text-sm py-3 cursor-pointer">Edit Details</DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl font-bold text-sm py-3 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleDelete(customer.id, customer.name)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                   </DropdownMenuContent>
                </DropdownMenu>
             </div>
             <CardContent className="p-8 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0064E0] border border-blue-100 group-hover:scale-110 transition-transform">
                   <Users className="w-7 h-7" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">{customer.name}</h3>
                   <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-4 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ACTIVE
                   </div>
                   
                   <div className="space-y-3">
                      <div className="flex items-start gap-3">
                         <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                         <p className="text-xs font-semibold text-gray-500 leading-relaxed">{customer.address || 'No address'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <User className="w-4 h-4 text-gray-400" />
                         <p className="text-xs font-bold text-gray-700">{customer.contact_person || 'No contact person'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <Mail className="w-4 h-4 text-gray-400" />
                         <p className="text-xs font-medium text-[#0064E0] hover:underline cursor-pointer">{customer.contact_info || 'No contact email'}</p>
                      </div>
                   </div>
                </div>
             </CardContent>
          </Card>
        )) : (
          <div className="col-span-full py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-gray-200" />
             </div>
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No customers found</p>
          </div>
        )}
      </div>
    </div>
  )
}
