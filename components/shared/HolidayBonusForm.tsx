import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gift, User, Euro, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { Profile } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

interface HolidayBonusFormProps {
  onSubmit: (data: any) => Promise<boolean>
  onCancel: () => void
  isSubmitting?: boolean
}

export function HolidayBonusForm({ onSubmit, onCancel, isSubmitting }: HolidayBonusFormProps) {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [employees, setEmployees] = useState<Profile[]>([])
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    notes: '',
  })

  useEffect(() => {
    const fetchEmployees = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .eq('role', 'employee')
        .eq('is_active', true)
      
      if (data) setEmployees(data)
    }
    if (profile?.organization_id) fetchEmployees()
  }, [profile?.organization_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employee_id || !formData.amount) return

    const success = await onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      created_at: new Date().toISOString()
    })
    
    if (success) onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <User className="w-3 h-3" /> {L('Mitarbeiter wählen', 'Select employee')}
          </Label>
          <select
            className="w-full h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 focus:bg-white transition-all font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500/10"
            value={formData.employee_id}
            onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
            required
          >
            <option value="">{L('Mitarbeiter auswählen…', 'Select an employee…')}</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Euro className="w-3 h-3" /> {L('Bonusbetrag', 'Bonus amount')}
          </Label>
          <Input 
            type="number" 
            placeholder="0.00"
            step="0.01"
            min="0"
            className="h-12 rounded-xl border-gray-100 bg-gray-50/50"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <FileText className="w-3 h-3" /> {L('Beschreibung', 'Bonus description')}
          </Label>
          <textarea
            placeholder={L('Weihnachtsbonus, Sommerurlaub, usw.', 'Christmas bonus, summer vacation, etc.')}
            className="w-full min-h-[100px] rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="pt-2 space-y-3">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
        >
          <Gift className="w-4 h-4" />
          {isSubmitting ? L('Wird verarbeitet…', 'Processing…') : L('Bonus vergeben', 'Distribute bonus')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="w-full h-12 rounded-xl font-bold text-gray-400"
        >
          {L('Abbrechen', 'Cancel')}
        </Button>
      </div>
    </form>
  )
}
