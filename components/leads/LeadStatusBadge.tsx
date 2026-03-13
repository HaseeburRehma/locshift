import { Badge } from '@/components/ui/badge'

export function LeadStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    new: { label: 'New', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    qualified: { label: 'Qualified', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
    scheduled: { label: 'Scheduled', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
    assigned: { label: 'Assigned', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    lost: { label: 'Lost', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    matched: { label: 'Matched', className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' }
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <Badge variant="outline" className={`border-0 ${config.className}`}>
      {config.label}
    </Badge>
  )
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const urgencyConfig: Record<string, { label: string; className: string; pulsing?: boolean }> = {
    urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 hover:bg-red-100', pulsing: true },
    high: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
    medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
    low: { label: 'Low', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  }

  const config = urgencyConfig[urgency] || { label: urgency, className: 'bg-gray-100 text-gray-800' }

  return (
    <Badge variant="outline" className={`border-0 flex items-center gap-1.5 w-fit ${config.className}`}>
      {config.pulsing && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      {config.label}
    </Badge>
  )
}
