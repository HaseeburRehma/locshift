import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  MapPin, 
  FileText, 
  Briefcase, 
  CheckCircle2,
  Euro
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { format, differenceInDays, parseISO } from 'date-fns'
import { usePlans } from '@/hooks/plans/usePlans'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

interface PerDiemFormProps {
  onSubmit: (data: any) => Promise<boolean>
  onCancel: () => void
  isSubmitting?: boolean
}

export function PerDiemForm({ onSubmit, onCancel, isSubmitting }: PerDiemFormProps) {
  const { plans, loading: loadingPlans } = usePlans()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [calculationMode, setCalculationMode] = useState<'daily' | 'hourly'>('daily')
  
  const [formData, setFormData] = useState({
    plan_id: '',
    task: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    country: 'Germany (Domestic)',
    rate: 28.00,
    hourly_rate: 15.00,
    working_hours: 8,
    notes: ''
  })

  const [numDays, setNumDays] = useState(1)
  const [totalAmount, setTotalAmount] = useState(28.00)

  // Filter plans to only show confirmed/assigned jobs for this employee
  const myPlans = plans.filter(p => p.status === 'confirmed' || p.status === 'assigned')

  useEffect(() => {
    if (calculationMode === 'daily') {
      const start = parseISO(formData.start_date)
      const end = parseISO(formData.end_date)
      const days = differenceInDays(end, start) + 1
      const validDays = days > 0 ? days : 1
      setNumDays(validDays)
      setTotalAmount(validDays * formData.rate)
    } else {
      setTotalAmount(formData.working_hours * formData.hourly_rate)
    }
  }, [formData.start_date, formData.end_date, formData.rate, formData.hourly_rate, formData.working_hours, calculationMode])

  const handlePlanSelect = (planId: string) => {
    const plan = myPlans.find(p => p.id === planId)
    if (plan) {
      setFormData(prev => ({
        ...prev,
        plan_id: planId,
        task: plan.customer?.name ? `Job at ${plan.customer.name}` : 'Mission Plan Job',
        start_date: plan.start_time.split('T')[0],
        end_date: plan.end_time.split('T')[0]
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.plan_id) {
       toast.error(L('Bitte einen Einsatz auswählen', 'Please select a mission/job'))
       return
    }

    const payload = {
      ...formData,
      date: formData.start_date,
      num_days: calculationMode === 'daily' ? numDays : 1,
      amount: totalAmount,
      status: 'submitted'
    }

    const success = await onSubmit(payload)
    if (success) {
      toast.success(L('Spesenantrag eingereicht', 'Per diem claim submitted'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      
      {/* Connect to Mission Plan */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-500 ml-1">{L('Mit Einsatz verknüpfen', 'Connect to Mission Plan')}</Label>
        <Select value={formData.plan_id} onValueChange={handlePlanSelect}>
          <SelectTrigger className="h-12 rounded-xl border border-gray-200 bg-gray-50/30 ring-offset-white focus:ring-2 focus:ring-blue-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <SelectValue placeholder={loadingPlans ? L('Einsätze werden geladen…', 'Loading jobs...') : L('Einsatz / Auftrag auswählen', 'Choose your job/mission')} />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-200 shadow-xl">
            {myPlans.length > 0 ? myPlans.map(p => (
              <SelectItem key={p.id} value={p.id} className="py-2 text-sm">
                {p.customer?.name || L('Unbenannter Auftrag', 'Unnamed Job')} — {format(parseISO(p.start_time), 'dd MMM yyyy')}
              </SelectItem>
            )) : (
              <div className="p-4 text-center text-xs font-medium text-gray-400">{L('Keine zugewiesenen Einsätze gefunden', 'No assigned jobs found')}</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Task / Description */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-500 ml-1">{L('Tätigkeit eingeben', 'Enter Task')}</Label>
        <Input
          placeholder={L('z. B. Gebäudereinigung', 'e.g. Building Cleaning')}
          className="h-12 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white transition-all focus:border-blue-500/50"
          value={formData.task}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, task: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 ml-1">{L('Startdatum', 'Start Date')}</Label>
          <div className="relative group">
            <Input 
              type="date" 
              className="h-12 rounded-xl border border-gray-200 bg-gray-50/50 font-medium focus:bg-white transition-all pl-4 text-sm"
              value={formData.start_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500 ml-1">{L('Enddatum', 'End Date')}</Label>
          <div className="relative group">
            <Input 
              type="date" 
              className="h-12 rounded-xl border border-gray-200 bg-gray-50/50 font-medium focus:bg-white transition-all pl-4 text-sm"
              value={formData.end_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, end_date: e.target.value })}
              required
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Country / Region */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-500 ml-1">{L('Land / Region', 'Country / Region')}</Label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            className="h-12 rounded-xl border border-gray-200 bg-gray-50/50 pl-10 font-medium focus:bg-white transition-all text-sm"
            value={formData.country}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, country: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Summary Table - Mockup Style */}
      <div className="p-6 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-500">{L('Anzahl Tage', 'Number of Days')}</span>
          <span className="font-bold text-gray-900">{numDays} {numDays === 1 ? L('Tag', 'day') : L('Tage', 'days')}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-500">{L('Spesensatz', 'Per Diem Rate')}</span>
          <span className="font-bold text-gray-900">€{formData.rate.toFixed(2)}/{L('Tag', 'day')}</span>
        </div>
        <div className="pt-4 border-t border-gray-200/50 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">{L('Gesamtbetrag', 'Total Amount')}</span>
          <span className="text-lg font-black text-[#0064E0]">€{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-500 ml-1">{L('Notizen (optional)', 'Notes (Optional)')}</Label>
        <textarea
          placeholder={L('Notizen hinzufügen', 'Add Notes')}
          className="w-full min-h-[80px] p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all outline-none focus:border-blue-500/50 resize-none"
          value={formData.notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-[#0064E0] hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all"
        >
          {isSubmitting ? L('Wird übermittelt…', 'Submitting...') : L('Antrag einreichen', 'Submit Claim')}
        </Button>
      </div>
    </form>
  )
}
