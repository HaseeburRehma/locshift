import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import type { TechnicianRow } from '@/lib/types/database.types'

export default async function TechniciansPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: technicians, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <span>Fehler beim Laden der Techniker: {error.message}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {technicians?.length ?? 0} aktive Techniker
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Techniker</TableHead>
              <TableHead className="hidden md:table-cell">Fähigkeiten</TableHead>
              <TableHead className="hidden md:table-cell">Servicegebiet</TableHead>
              <TableHead>Verfügbar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(technicians ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Keine Techniker vorhanden
                </TableCell>
              </TableRow>
            ) : (
              (technicians as TechnicianRow[]).map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell>
                    <div className="font-medium">{tech.name}</div>
                    <div className="text-xs text-muted-foreground">{tech.phone}</div>
                    {tech.email && (
                      <div className="text-xs text-muted-foreground">{tech.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(tech.skills ?? []).slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {(tech.skills ?? []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(tech.skills ?? []).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {(tech.service_area ?? []).join(', ') || '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tech.is_available ? (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verfügbar
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" /> Belegt
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
