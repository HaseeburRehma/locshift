'use client'

import { useState } from 'react'
import { LayoutGrid, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadsTable } from './LeadsTable'
import { LeadsKanban } from './LeadsKanban'
import type { Lead } from '@/lib/types'

type ViewMode = 'table' | 'kanban'

interface LeadsViewProps {
  leads: Lead[]
}

export function LeadsView({ leads }: LeadsViewProps) {
  const [mode, setMode] = useState<ViewMode>('table')

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center rounded-lg border border-border bg-muted p-0.5 gap-0.5">
          <Button
            variant={mode === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-3"
            onClick={() => setMode('table')}
          >
            <Table2 className="h-4 w-4" />
            Table
          </Button>
          <Button
            variant={mode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-3"
            onClick={() => setMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {mode === 'table' ? (
        <LeadsTable leads={leads} />
      ) : (
        <LeadsKanban leads={leads} />
      )}
    </div>
  )
}
