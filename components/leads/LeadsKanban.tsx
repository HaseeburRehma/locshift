'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock } from 'lucide-react'
import type { Lead } from '@/lib/types'

// ─── Config ───────────────────────────────────────────────────────────────────

type KanbanStatus = 'new' | 'qualified' | 'scheduled' | 'assigned' | 'completed'

const COLUMNS: { status: KanbanStatus; label: string; headerClass: string }[] = [
  { status: 'new', label: 'New', headerClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { status: 'qualified', label: 'Qualified', headerClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { status: 'scheduled', label: 'Scheduled', headerClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { status: 'assigned', label: 'Assigned', headerClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  { status: 'completed', label: 'Completed', headerClass: 'bg-green-50 text-green-700 border-green-200' },
]

const urgencyConfig: Record<string, { label: string; icon: 'alert' | 'clock'; className: string }> = {
  high: { label: 'High', icon: 'alert', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', icon: 'clock', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: 'Low', icon: 'clock', className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: Lead }) {
  const router = useRouter()
  const uc = urgencyConfig[lead.urgency] ?? urgencyConfig['medium']

  return (
    <div
      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
      className="bg-white rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight">{lead.name}</p>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${uc.className}`}>
          {uc.icon === 'alert'
            ? <AlertCircle className="inline h-2.5 w-2.5 mr-0.5" />
            : <Clock className="inline h-2.5 w-2.5 mr-0.5" />}
          {uc.label}
        </Badge>
      </div>
      {lead.city && (
        <p className="text-xs text-muted-foreground">{lead.city}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{lead.phone}</p>
        {lead.estimated_value && (
          <p className="text-xs font-medium text-foreground">{lead.estimated_value}</p>
        )}
      </div>
      {lead.service_type && (
        <Badge variant="secondary" className="text-[10px]">{lead.service_type}</Badge>
      )}
    </div>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

interface LeadsKanbanProps {
  leads: Lead[]
}

export function LeadsKanban({ leads }: LeadsKanbanProps) {
  const grouped = COLUMNS.reduce<Record<KanbanStatus, Lead[]>>((acc, col) => {
    acc[col.status] = leads.filter((l) => l.status === col.status)
    return acc
  }, { new: [], qualified: [], scheduled: [], assigned: [], completed: [] })

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnLeads = grouped[col.status]
        return (
          <div key={col.status} className="flex-shrink-0 w-64">
            {/* Column header */}
            <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg border ${col.headerClass}`}>
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge className="h-5 min-w-5 text-xs px-1.5 rounded-full bg-current/20 text-current border-0">
                {columnLeads.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {columnLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                  No leads
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
