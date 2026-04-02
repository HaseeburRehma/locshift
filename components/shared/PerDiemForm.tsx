import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, MapPin, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface PerDiemFormProps {
  onSubmit: (data: any) => Promise<boolean>
  onCancel: () => void
  isSubmitting?: boolean
}

export function PerDiemForm({ onSubmit, onCancel, isSubmitting }: PerDiemFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    departure_time: '08:00',
    return_time: '18:00',
    country: 'Germany',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Convert times to valid ISO strings for the current date
    const payload = {
      ...formData,
      departure_time: formData.departure_time ? `${formData.date}T${formData.departure_time}:00Z` : null,
      return_time: formData.return_time ? `${formData.date}T${formData.return_time}:00Z` : null,
      amount: 28.00 // Default for > 24h, logic could be more complex later
    }

    const success = await onSubmit(payload)
    if (success) {
      toast.success('Claim submitted successfully')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Travel Date
          </Label>
          <Input 
            type="date" 
            className="h-12 rounded-xl border-gray-100 bg-gray-50/50"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Departure
            </Label>
            <Input 
              type="time" 
              className="h-12 rounded-xl border-gray-100 bg-gray-50/50"
              value={formData.departure_time}
              onChange={e => setFormData({ ...formData, departure_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Return
            </Label>
            <Input 
              type="time" 
              className="h-12 rounded-xl border-gray-100 bg-gray-50/50"
              value={formData.return_time}
              onChange={e => setFormData({ ...formData, return_time: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Destination Country
          </Label>
          <Input 
            placeholder="e.g. Germany"
            className="h-12 rounded-xl border-gray-100 bg-gray-50/50"
            value={formData.country}
            onChange={e => setFormData({ ...formData, country: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <FileText className="w-3 h-3" /> Notes
          </Label>
          <textarea 
            placeholder="Route details..."
            className="w-full min-h-[80px] rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="pt-2 space-y-3">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-[#0064E0] hover:bg-[#0050B3] text-white font-bold"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Claim'}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          className="w-full h-12 rounded-xl font-bold text-gray-400"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
