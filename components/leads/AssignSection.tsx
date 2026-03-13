'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, MapPin, UserPlus } from 'lucide-react'
import { AssignTechnicianSheet } from './AssignTechnicianSheet'
import type { Technician } from '@/lib/types'

interface AssignSectionProps {
  leadId: string
  technicians: Technician[]
}

export function AssignSection({ leadId, technicians }: AssignSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)

  const handleAssignClick = (techId: string) => {
    setSelectedTechId(techId)
    setSheetOpen(true)
  }

  if (technicians.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground space-y-1">
        <Wrench className="h-8 w-8 mx-auto opacity-30 mb-2" />
        <p>No available technicians</p>
        <p className="text-xs">All technicians are currently busy or inactive.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {technicians.map((tech) => (
          <div
            key={tech.id}
            className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-medium text-sm">{tech.name}</p>
              {(tech.service_area ?? []).length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {tech.service_area!.join(', ')}
                </p>
              )}
              {(tech.skills ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(tech.skills ?? []).slice(0, 3).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px] h-4 px-1.5">
                      <Wrench className="h-2.5 w-2.5 mr-0.5" />
                      {s}
                    </Badge>
                  ))}
                  {(tech.skills ?? []).length > 3 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      +{(tech.skills ?? []).length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 h-8 text-xs"
              onClick={() => handleAssignClick(tech.id)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </Button>
          </div>
        ))}
      </div>

      <AssignTechnicianSheet
        leadId={leadId}
        technicians={technicians}
        open={sheetOpen}
        selectedTechnicianId={selectedTechId}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
