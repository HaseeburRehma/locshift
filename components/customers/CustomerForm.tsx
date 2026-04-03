'use client'

import React, { useState, useEffect } from 'react'
import { Customer } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { useCustomers } from '@/hooks/useCustomers'

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer // If provided, we are in edit mode
  onSuccess?: () => void
}

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const { locale } = useTranslation()
  const { addCustomer, updateCustomer } = useCustomers()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person: '',
    email: '',
    phone: '',
    notes: '',
    is_active: true
  })

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        address: customer.address || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        notes: customer.notes || '',
        is_active: customer.is_active ?? true
      })
    } else {
      setFormData({
        name: '',
        address: '',
        contact_person: '',
        email: '',
        phone: '',
        notes: '',
        is_active: true
      })
    }
  }, [customer, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error(locale === 'en' ? 'Customer name is required' : 'Kundenname ist erforderlich')
      return
    }

    setLoading(true)
    try {
      if (customer) {
        await updateCustomer(customer.id, formData)
        toast.success(locale === 'en' ? 'Customer updated' : 'Kunde aktualisiert')
      } else {
        await addCustomer(formData)
        toast.success(locale === 'en' ? 'Customer added' : 'Kunde angelegt')
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-slate-100 shadow-2xl p-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 leading-none">
              {customer ? (locale === 'en' ? 'Edit Customer' : 'Kunde bearbeiten') : (locale === 'en' ? 'Create New Customer' : 'Neuen Kunden anlegen')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
             <div className="space-y-4">
                <div className="grid gap-2">
                   <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Company Name</Label>
                   <Input 
                      id="name" 
                      value={formData.name} 
                      placeholder="e.g. TyloTech Dusseldorf"
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-12 rounded-xl border-slate-200 bg-white font-bold"
                   />
                </div>

                <div className="grid gap-2">
                   <Label htmlFor="address" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Address</Label>
                   <Input 
                      id="address" 
                      value={formData.address} 
                      placeholder="Street, ZIP, City"
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="h-12 rounded-xl border-slate-200 bg-white font-bold text-sm"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="grid gap-2">
                      <Label htmlFor="contact_person" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Primary Contact</Label>
                      <Input 
                         id="contact_person" 
                         value={formData.contact_person} 
                         placeholder="Name"
                         onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                         className="h-12 rounded-xl border-slate-200 bg-white font-bold text-sm"
                      />
                   </div>
                   <div className="grid gap-2">
                      <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</Label>
                      <Input 
                         id="email" 
                         type="email"
                         value={formData.email} 
                         placeholder="mail@customer.com"
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                         className="h-12 rounded-xl border-slate-200 bg-white font-bold text-sm"
                      />
                   </div>
                </div>

                <div className="grid gap-2">
                   <Label htmlFor="phone" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone</Label>
                   <Input 
                      id="phone" 
                      value={formData.phone} 
                      placeholder="+49..."
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="h-12 rounded-xl border-slate-200 bg-white font-bold text-sm"
                   />
                </div>

                <div className="grid gap-2">
                   <Label htmlFor="notes" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Operational Notes</Label>
                   <Textarea 
                      id="notes" 
                      value={formData.notes} 
                      placeholder="Project details, special access, etc."
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="min-h-[100px] rounded-xl border-slate-200 bg-white font-medium text-sm"
                   />
                </div>
             </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
             <Button 
                type="submit" 
                disabled={loading}
                className="h-12 rounded-xl px-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200"
             >
                {loading ? 'Processing...' : (customer ? 'Update Record' : 'Save Customer')}
             </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
