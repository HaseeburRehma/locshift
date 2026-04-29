import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { Customer, TimeEntryFormData } from '@/lib/types'
import { Calendar, Clock, MapPin, FileText, User } from 'lucide-react'

interface TimeEntryFormProps {
  onSuccess: () => void
  onCancel: () => void
  isSubmitting?: boolean
  onSubmit: (data: TimeEntryFormData) => Promise<boolean>
  initialData?: Partial<TimeEntryFormData>
}

export function TimeEntryForm({ onSuccess, onCancel, isSubmitting, onSubmit, initialData }: TimeEntryFormProps) {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en
  const [customers, setCustomers] = useState<Customer[]>([])
  
  const [formData, setFormData] = useState<TimeEntryFormData>({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    startTime: initialData?.startTime || '08:00',
    endTime: initialData?.endTime || '16:00',
    breakMinutes: initialData?.breakMinutes ?? 30,
    customerId: initialData?.customerId || '',
    location: initialData?.location || '',
    notes: initialData?.notes || '',
  })

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .eq('is_active', true)
        .order('name')
      
      if (data) setCustomers(data)
    }
    if (profile?.organization_id) fetchCustomers()
  }, [profile?.organization_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validations
    if (formData.endTime <= formData.startTime) {
      alert(L('Endzeit muss nach Startzeit liegen', 'End time must be after start time'))
      return
    }

    const success = await onSubmit(formData)
    if (success) onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: The "When" (Shift Duration) */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Clock className="w-5 h-5 text-[#0064E0]" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-gray-900 leading-none">{L('Schichtdauer', 'Shift Duration')}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{L('Zeit & Datumsprotokoll', 'Time & Date Logs')}</p>
             </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-1">{L('Einsatzdatum', 'Date of Service')}</Label>
              <Input 
                type="date" 
                className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold px-6 border-none shadow-sm"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-1">{L('Beginn', 'Start Time')}</Label>
                <Input 
                  type="time" 
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold px-6 border-none shadow-sm"
                  value={formData.startTime}
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-1">{L('Ende', 'End Time')}</Label>
                <Input 
                  type="time" 
                  className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold px-6 border-none shadow-sm"
                  value={formData.endTime}
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The "Where & Who" (Operational Context) */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100">
                <MapPin className="w-5 h-5 text-orange-500" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-gray-900 leading-none">{L('Einsatzkontext', 'Operational Context')}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{L('Projekte & Pausen', 'Projects & Breaks')}</p>
             </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-1">{L('Pausendauer (Minuten)', 'Break Duration (Minutes)')}</Label>
              <Input 
                type="number" 
                min="0"
                className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold px-6 border-none shadow-sm"
                value={formData.breakMinutes}
                onChange={e => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-1">{L('Zielkunde', 'Target Customer')}</Label>
              <select
                className="w-full h-14 rounded-2xl border-gray-100 bg-gray-50/50 px-6 focus:bg-white transition-all font-bold appearance-none outline-none focus:ring-2 focus:ring-[#0064E0]/10 shadow-sm border-none"
                value={formData.customerId}
                onChange={e => setFormData({ ...formData, customerId: e.target.value })}
              >
                <option value="">{L('Kunde auswählen...', 'Select a customer...')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section: Full Width */}
      <div className="space-y-2 mt-8">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-1 flex items-center gap-2">
          <FileText className="w-3 h-3" /> {L('Notizen & Einsatzdetails', 'Notes & Deployment Details')}
        </Label>
        <textarea 
          placeholder={L('Weitere Schichtdetails oder Anweisungen...', 'Additional shift details or instructions...')}
          className="w-full min-h-[120px] rounded-3xl border-none bg-gray-50/50 p-6 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0064E0]/10 transition-all font-bold text-sm shadow-sm"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      {/* Action Bar */}
      <div className="pt-8 flex flex-col md:flex-row items-center gap-4">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          className="w-full md:w-auto h-14 rounded-2xl px-10 font-bold text-gray-400 hover:text-gray-900"
        >
          {L('Abbrechen', 'Cancel')}
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:flex-1 h-14 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? L('Wird gespeichert...', 'Saving Entry...') : L('Schicht bestätigen & erfassen', 'Confirm & Log Shift')}
        </Button>
      </div>
    </form>
  )
}
