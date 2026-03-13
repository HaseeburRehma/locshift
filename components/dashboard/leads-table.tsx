'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Bot, UserPlus, Clock, CheckCircle, AlertCircle, Edit2, Save, X } from 'lucide-react'
import type { Lead, Job, Technician } from '@/lib/types'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface LeadsTableProps {
  leads: Lead[]
  technicians?: Technician[]
  jobs?: Job[]
  onQualify?: (leadId: string) => Promise<void>
  onMatch?: (leadId: string) => Promise<void>
  onRefresh: () => void
  canManageLeads?: boolean
}

export function LeadsTable({ leads, technicians = [], jobs = [], onQualify, onMatch, onRefresh, canManageLeads = false }: LeadsTableProps) {
  const { t, locale } = useTranslation()
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Lead>>({})
  const [assignedTechId, setAssignedTechId] = useState<string>('none')

  // i18n-aware config objects – rebuilt on each render so they pick up locale changes
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    new: { label: locale === 'en' ? 'New' : 'Neu', variant: 'default' },
    qualified: { label: locale === 'en' ? 'Qualified' : 'Qualifiziert', variant: 'secondary' },
    matched: { label: locale === 'en' ? 'Assigned' : 'Zugewiesen', variant: 'outline' },
    scheduled: { label: locale === 'en' ? 'Scheduled' : 'Geplant', variant: 'outline' },
    completed: { label: locale === 'en' ? 'Completed' : 'Abgeschlossen', variant: 'secondary' },
    cancelled: { label: locale === 'en' ? 'Cancelled' : 'Abgebrochen', variant: 'destructive' },
  }

  const urgencyConfig: Record<string, { label: string; className: string }> = {
    high: { label: locale === 'en' ? 'Urgent' : 'Dringend', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    medium: { label: locale === 'en' ? 'Medium' : 'Mittel', className: 'bg-accent/10 text-accent-foreground border-accent/20' },
    low: { label: locale === 'en' ? 'Low' : 'Niedrig', className: 'bg-muted text-muted-foreground border-border' },
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id)
    setEditData({ ...lead })
    const existingJob = jobs?.find(j => j.lead_id === lead.id)
    setAssignedTechId(existingJob?.technician_id || 'none')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
    setAssignedTechId('none')
  }

  const handleSave = async (leadId: string) => {
    setLoading(leadId)
    try {
      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, ...editData }),
      })
      if (!response.ok) throw new Error('Failed to save')

      const existingJob = jobs?.find(j => j.lead_id === leadId)
      if (assignedTechId && assignedTechId !== 'none') {
        if (existingJob) {
          if (existingJob.technician_id !== assignedTechId) {
             await fetch('/api/jobs', {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id: existingJob.id, technician_id: assignedTechId, status: 'scheduled' })
             })
          }
        } else {
             await fetch('/api/jobs', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                 lead_id: leadId, 
                 technician_id: assignedTechId, 
                 status: 'scheduled',
                 estimated_duration: 120
               })
             })
             await fetch('/api/leads', {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id: leadId, status: 'scheduled' })
             })
        }
      } else if (existingJob && existingJob.technician_id) {
         await fetch('/api/jobs', {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ id: existingJob.id, technician_id: null, status: 'pending' })
         })
         await fetch('/api/leads', {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ id: leadId, status: 'qualified' })
         })
      }

      toast.success(locale === 'en' ? 'Changes saved' : 'Änderungen gespeichert')
      setEditingId(null)
      setEditData({})
      setAssignedTechId('none')
      onRefresh()
    } catch {
      toast.error(locale === 'en' ? 'Failed to save changes' : 'Fehler beim Speichern')
    } finally {
      setLoading(null)
    }
  }

  const handleQualify = async (leadId: string) => {
    if (!onQualify) return
    setLoading(leadId)
    await onQualify(leadId)
    setLoading(null)
    onRefresh()
  }

  const handleMatch = async (leadId: string) => {
    if (!onMatch) return
    setLoading(leadId)
    await onMatch(leadId)
    setLoading(null)
    onRefresh()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Leads
          </CardTitle>
          <CardDescription>
            {locale === 'en' ? 'Manage incoming customer enquiries' : 'Eingehende Kundenanfragen verwalten'}
          </CardDescription>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={locale === 'en' ? 'Filter' : 'Filter'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{locale === 'en' ? 'All' : 'Alle'}</SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === 'en' ? 'Customer' : 'Kunde'}</TableHead>
                <TableHead className="hidden md:table-cell">{locale === 'en' ? 'Description' : 'Beschreibung'}</TableHead>
                <TableHead>{locale === 'en' ? 'Status' : 'Status'}</TableHead>
                <TableHead className="hidden sm:table-cell">{locale === 'en' ? 'Urgency' : 'Dringlichkeit'}</TableHead>
                <TableHead className="hidden lg:table-cell">{locale === 'en' ? 'Received' : 'Eingang'}</TableHead>
                <TableHead className="text-right">{locale === 'en' ? 'Actions' : 'Aktionen'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mb-2" />
                      <p>{locale === 'en' ? 'No leads found' : 'Keine Leads gefunden'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const isEditing = editingId === lead.id
                  return (
                    <>
                      {/* Normal display row */}
                      <TableRow key={lead.id} className={isEditing ? 'bg-primary/5 border-primary/20' : ''}>
                        <TableCell>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-muted-foreground">{lead.phone}</div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell max-w-[280px]">
                          <p className="truncate text-sm text-muted-foreground">{lead.description}</p>
                          {lead.job_type && (
                            <Badge variant="outline" className="mt-1 text-xs">{lead.job_type}</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant={statusConfig[lead.status]?.variant || 'default'}>
                            {statusConfig[lead.status]?.label || lead.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="hidden sm:table-cell">
                          {lead.urgency ? (
                            <Badge variant="outline" className={urgencyConfig[lead.urgency]?.className}>
                              {lead.urgency === 'high' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {lead.urgency === 'medium' && <Clock className="h-3 w-3 mr-1" />}
                              {urgencyConfig[lead.urgency]?.label || lead.urgency}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(lead.created_at)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleCancel} disabled={loading === lead.id}>
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button size="sm" className="h-8 w-8 p-0" onClick={() => handleSave(lead.id)} disabled={loading === lead.id}>
                                  {loading === lead.id ? <Spinner className="h-3 w-3" /> : <Save className="h-4 w-4" />}
                                </Button>
                              </>
                            ) : (
                              <>
                                {canManageLeads && (
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(lead)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {lead.status === 'new' && onQualify && canManageLeads && (
                                  <Button size="sm" onClick={() => handleQualify(lead.id)} disabled={loading === lead.id}>
                                    {loading === lead.id ? <Spinner className="h-4 w-4" /> : (
                                      <>
                                        <Bot className="h-4 w-4 mr-1" />
                                        {locale === 'en' ? 'Qualify' : 'Qualifizieren'}
                                      </>
                                    )}
                                  </Button>
                                )}
                                {lead.status === 'qualified' && onMatch && canManageLeads && (
                                  <Button size="sm" variant="secondary" onClick={() => handleMatch(lead.id)} disabled={loading === lead.id}>
                                    {loading === lead.id ? <Spinner className="h-4 w-4" /> : (
                                      <>
                                        <UserPlus className="h-4 w-4 mr-1" />
                                        {locale === 'en' ? 'Assign' : 'Zuweisen'}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Edit panel — expands as a separate full-width row below */}
                      {isEditing && (
                        <TableRow key={`${lead.id}-edit`} className="bg-primary/5 hover:bg-primary/5">
                          <TableCell colSpan={6} className="py-4 px-4 bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                              {/* Name */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {locale === 'en' ? 'Name' : 'Name'}
                                </label>
                                <Input
                                  value={editData.name || ''}
                                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                  className="h-9 text-sm bg-background"
                                  placeholder={locale === 'en' ? 'Customer name' : 'Kundenname'}
                                />
                              </div>

                              {/* Phone */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {locale === 'en' ? 'Phone' : 'Telefon'}
                                </label>
                                <Input
                                  value={editData.phone || ''}
                                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                  className="h-9 text-sm bg-background"
                                  placeholder="+49 ..."
                                />
                              </div>

                              {/* Job Type */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {locale === 'en' ? 'Job Type' : 'Auftragstyp'}
                                </label>
                                <Input
                                  value={editData.job_type || ''}
                                  onChange={(e) => setEditData({ ...editData, job_type: e.target.value })}
                                  className="h-9 text-sm bg-background"
                                  placeholder={locale === 'en' ? 'e.g. Plumbing' : 'z.B. Sanitär'}
                                />
                              </div>

                              {/* Assign Technician */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {locale === 'en' ? 'Assign Tech' : 'Zuweisen'}
                                </label>
                                <Select value={assignedTechId} onValueChange={setAssignedTechId}>
                                  <SelectTrigger className="h-9 text-sm bg-background">
                                    <SelectValue placeholder={locale === 'en' ? 'Select technician...' : 'Techniker wählen...'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-sm">{locale === 'en' ? 'Unassigned' : 'Nicht zugewiesen'}</SelectItem>
                                    {technicians?.map((t) => (
                                      <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Status & Urgency */}
                              <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2 xl:col-span-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {locale === 'en' ? 'Status & Urgency' : 'Status & Dringlichkeit'}
                                </label>
                                <div className="flex gap-3">
                                  <Select value={editData.status} onValueChange={(val) => setEditData({ ...editData, status: val as Lead['status'] })}>
                                    <SelectTrigger className="h-9 text-sm bg-background flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(statusConfig).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={editData.urgency || 'medium'} onValueChange={(val) => setEditData({ ...editData, urgency: val as Lead['urgency'] })}>
                                    <SelectTrigger className="h-9 text-sm bg-background flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(urgencyConfig).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Description */}
                              <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {locale === 'en' ? 'Description' : 'Beschreibung'}
                                </label>
                                <Textarea
                                  value={editData.description || ''}
                                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                  className="text-sm resize-none h-20 bg-background"
                                  placeholder={locale === 'en' ? 'Customer description...' : 'Kundenbeschreibung...'}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
