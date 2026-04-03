'use client'

import React, { useState } from 'react'
import { WorkingTimeModel } from '@/lib/types'
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

interface WorkModelFormProps {
  model?: WorkingTimeModel | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<WorkingTimeModel>) => Promise<void>
}

export function WorkModelForm({ model, isOpen, onClose, onSubmit }: WorkModelFormProps) {
  const [formData, setFormData] = useState<Partial<WorkingTimeModel>>({
    name: '',
    description: '',
    target_hours_per_week: 40,
    is_active: true
  })
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (model) {
      setFormData({
        name: model.name,
        description: model.description || '',
        target_hours_per_week: model.target_hours_per_week,
        is_active: model.is_active
      })
    } else {
      setFormData({
        name: '',
        description: '',
        target_hours_per_week: 40,
        is_active: true
      })
    }
  }, [model, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2rem] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight uppercase">
            {model ? 'Edit Model' : 'New Work Model'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Model Name</Label>
            <Input
              required
              placeholder="e.g. Standard 40h"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-2xl border-slate-100 h-12 focus:ring-blue-600 focus:border-blue-600 font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Target Hours (Per Week)</Label>
            <Input
              required
              type="number"
              step="0.5"
              placeholder="40.0"
              value={formData.target_hours_per_week}
              onChange={(e) => setFormData({ ...formData, target_hours_per_week: parseFloat(e.target.value) })}
              className="rounded-2xl border-slate-100 h-12 focus:ring-blue-600 focus:border-blue-600 font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Description</Label>
            <Textarea
              placeholder="Shift and time calculation details..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="rounded-2xl border-slate-100 min-h-[100px] focus:ring-blue-600 focus:border-blue-600 font-medium p-4"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl font-bold uppercase tracking-widest text-[11px] h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 font-bold uppercase tracking-widest text-[11px] h-11 px-8"
            >
              {loading ? 'Saving...' : (model ? 'Update' : 'Create Model')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
