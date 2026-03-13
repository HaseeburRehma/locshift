'use client'

import { useEffect, useState } from 'react'
import { formatDuration, intervalToDuration, isPast, isFuture, format } from 'date-fns'

interface JobTimerProps {
  jobId: string
  status: string
  scheduledTime: string | null
  startedAt?: string | null
}

export function JobTimer({ status, scheduledTime, startedAt }: JobTimerProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (status === 'completed' || status === 'cancelled') return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [status])

  if (status === 'cancelled') {
    return <div className="text-sm font-medium text-red-600">Cancelled</div>
  }

  if (status === 'completed') {
    return <div className="text-sm font-medium text-green-600">Completed</div>
  }

  if (status === 'in_progress' && startedAt) {
    const start = new Date(startedAt)
    const duration = intervalToDuration({ start, end: now })
    const formatted = formatDuration(duration, { format: ['hours', 'minutes', 'seconds'], zero: true })
    
    return (
      <div className="text-sm font-medium text-green-600 font-mono">
        In Progress — {formatted || '0 seconds'}
      </div>
    )
  }

  if (status === 'scheduled' || status === 'pending') {
    if (!scheduledTime) return <div className="text-sm text-muted-foreground">Not Scheduled</div>
    
    const schedTime = new Date(scheduledTime)
    
    if (isPast(schedTime)) {
      return (
        <div className="text-sm font-medium text-red-500">
          ⚠ Overdue — should have started
        </div>
      )
    }

    if (isFuture(schedTime)) {
      const duration = intervalToDuration({ start: now, end: schedTime })
      return (
        <div className="text-sm font-medium text-blue-600 font-mono">
          Starts in {duration.days ? `${duration.days}d ` : ''}{duration.hours}h {duration.minutes}m {duration.seconds}s
        </div>
      )
    }
  }

  return <div className="text-sm text-muted-foreground">—</div>
}
