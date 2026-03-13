'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateJobStatus } from '@/app/actions/leads'

interface JobCompleteButtonProps {
  jobId: string
  leadId: string
}

export function JobCompleteButton({ jobId, leadId }: JobCompleteButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleComplete = () => {
    startTransition(async () => {
      const result = await updateJobStatus(jobId, 'completed', leadId)
      if (result.success) {
        toast.success('Job marked as completed!')
      } else {
        toast.error(result.error ?? 'Failed to complete job')
      }
    })
  }

  return (
    <Button
      onClick={handleComplete}
      disabled={isPending}
      className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
      {isPending ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Completing...</>
      ) : (
        <><CheckCircle2 className="h-4 w-4" /> Mark Complete</>
      )}
    </Button>
  )
}
