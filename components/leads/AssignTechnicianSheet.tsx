'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserCheck, AlertCircle, Wrench, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { assignTechnician } from '@/app/actions/leads'
import type { Technician } from '@/lib/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const AssignSchema = z.object({
  scheduledTime: z.string().min(1, 'Please select a date and time'),
  estimatedDuration: z.coerce.number().int().min(30),
  notes: z.string().optional(),
})

type AssignValues = z.infer<typeof AssignSchema>

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
]

// Default to tomorrow at 09:00
function defaultScheduledTime() {
  const tomorrow = addDays(new Date(), 1)
  tomorrow.setHours(9, 0, 0, 0)
  return format(tomorrow, "yyyy-MM-dd'T'HH:mm")
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AssignTechnicianSheetProps {
  leadId: string
  technicians: Technician[]
  open: boolean
  selectedTechnicianId: string | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AssignTechnicianSheet({
  leadId,
  technicians,
  open,
  selectedTechnicianId,
  onOpenChange,
  onSuccess,
}: AssignTechnicianSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const selectedTech = technicians.find((t) => t.id === selectedTechnicianId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignValues>({
    resolver: zodResolver(AssignSchema),
    defaultValues: {
      scheduledTime: defaultScheduledTime(),
      estimatedDuration: 120,
      notes: '',
    },
  })

  const durationValue = watch('estimatedDuration')

  const onSubmit = (values: AssignValues) => {
    if (!selectedTechnicianId) return
    setServerError(null)

    startTransition(async () => {
      const result = await assignTechnician({
        leadId,
        technicianId: selectedTechnicianId,
        scheduledTime: values.scheduledTime,
        estimatedDuration: values.estimatedDuration,
        notes: values.notes,
      })

      if (result.success) {
        toast.success('Technician assigned successfully!')
        reset()
        onOpenChange(false)
        onSuccess?.()
      } else {
        setServerError(result.error ?? 'Assignment failed')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign Technician
          </SheetTitle>
          <SheetDescription>
            Schedule a technician for this job.
          </SheetDescription>
        </SheetHeader>

        {/* Selected technician info */}
        {selectedTech ? (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="font-semibold text-sm">{selectedTech.name}</p>
            {selectedTech.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedTech.phone}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {(selectedTech.skills ?? []).slice(0, 4).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  <Wrench className="h-2.5 w-2.5 mr-1" />
                  {s}
                </Badge>
              ))}
            </div>
            {(selectedTech.service_area ?? []).length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedTech.service_area!.join(', ')}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            Please select a technician first.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Scheduled time */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduledTime">Scheduled Date & Time</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              className="h-10"
              {...register('scheduledTime')}
            />
            {errors.scheduledTime && (
              <p className="text-xs text-destructive">{errors.scheduledTime.message}</p>
            )}
          </div>

          {/* Estimated duration */}
          <div className="space-y-1.5">
            <Label>Estimated Duration</Label>
            <Select
              value={String(durationValue)}
              onValueChange={(v) => setValue('estimatedDuration', Number(v))}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions for the technician..."
              className="resize-none h-24"
              {...register('notes')}
            />
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !selectedTechnicianId}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Assigning...</>
            ) : (
              <><UserCheck className="h-4 w-4 mr-2" /> Confirm Assignment</>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
