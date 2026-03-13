import { Badge } from '@/components/ui/badge'

export function JobStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; pulsing?: boolean }> = {
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800', pulsing: true },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    confirmed: { label: 'Confirmed', className: 'bg-indigo-100 text-indigo-800' }
  }

  const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <Badge variant="outline" className={`border-0 flex items-center gap-1.5 w-fit ${c.className}`}>
      {c.pulsing && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
      )}
      {c.label}
    </Badge>
  )
}
