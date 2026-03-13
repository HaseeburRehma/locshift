'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateLeadStatus } from '@/app/actions/leads'
import type { Lead } from '@/lib/types'
import { cn } from '@/lib/utils'

type PipelineStatus = 'new' | 'qualified' | 'scheduled' | 'assigned' | 'completed'

const STAGES: { status: PipelineStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'qualified', label: 'Qualified' },
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'completed', label: 'Completed' },
]

const STATUS_ORDER: Record<PipelineStatus, number> = {
  new: 0,
  qualified: 1,
  scheduled: 2,
  assigned: 3,
  completed: 4,
}

interface StatusStepperProps {
  leadId: string
  currentStatus: Lead['status']
}

export function StatusStepper({ leadId, currentStatus }: StatusStepperProps) {
  const [isPending, startTransition] = useTransition()
  const [updatingTo, setUpdatingTo] = useState<PipelineStatus | null>(null)

  // Map non-pipeline statuses to nearest pipeline status
  const activeStatus = (
    STATUS_ORDER[currentStatus as PipelineStatus] !== undefined
      ? currentStatus
      : 'new'
  ) as PipelineStatus

  const currentIndex = STATUS_ORDER[activeStatus] ?? 0

  const handleStepClick = (stage: PipelineStatus) => {
    const targetIndex = STATUS_ORDER[stage]
    // Don't allow going backwards past qualified
    if (targetIndex < currentIndex && currentIndex > 1) return
    if (stage === activeStatus) return

    setUpdatingTo(stage)
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, stage)
      if (result.success) {
        toast.success(`Status updated to ${stage}`)
      } else {
        toast.error(result.error ?? 'Failed to update status')
      }
      setUpdatingTo(null)
    })
  }

  return (
    <div className="flex items-center gap-0">
      {STAGES.map((stage, i) => {
        const stageIndex = STATUS_ORDER[stage.status]
        const isCompleted = stageIndex < currentIndex
        const isCurrent = stage.status === activeStatus
        const isUpdating = updatingTo === stage.status

        const canClick = !(stageIndex < currentIndex && currentIndex > 1)

        return (
          <div key={stage.status} className="flex items-center flex-1 min-w-0">
            {/* Step node */}
            <button
              onClick={() => handleStepClick(stage.status)}
              disabled={isPending || !canClick}
              className={cn(
                'flex flex-col items-center gap-1.5 flex-shrink-0 disabled:cursor-not-allowed',
                canClick && 'cursor-pointer',
              )}
            >
              <div
                className={cn(
                  'h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'bg-primary border-primary text-primary-foreground scale-110 shadow-md shadow-primary/30',
                  !isCompleted && !isCurrent && 'bg-background border-border text-muted-foreground',
                  canClick && !isCurrent && 'hover:border-primary/50',
                )}
              >
                {isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap hidden sm:block',
                  isCurrent ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {stage.label}
              </span>
            </button>

            {/* Connector line (not after last item) */}
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-1 rounded-full transition-colors',
                  stageIndex < currentIndex ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
