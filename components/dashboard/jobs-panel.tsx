'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Briefcase,
  Calendar,
  User,
  MessageSquare,
  Star,
  Clock,
  CheckCircle,
  Play,
  Edit2,
  Save,
  X
} from 'lucide-react'
import type { Job } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

interface JobsPanelProps {
  jobs: Job[]
  onUpdateStatus?: (jobId: string, status: string) => Promise<void>
  onSendMessage?: (jobId: string, template: string) => Promise<void>
  onRefresh: () => void
  canManageJobs?: boolean
}

export function JobsPanel({ jobs, onUpdateStatus, onSendMessage, onRefresh, canManageJobs = false }: JobsPanelProps) {
  const { t, locale } = useTranslation()
  const [loadingJob, setLoadingJob] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Job>>({})

  // Defensive guard — API may return error object instead of array on timeout
  const safeJobs = Array.isArray(jobs) ? jobs : []

  const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    pending: { label: locale === 'en' ? 'Pending' : 'Ausstehend', icon: Clock, color: 'text-muted-foreground' },
    scheduled: { label: locale === 'en' ? 'Scheduled' : 'Geplant', icon: Calendar, color: 'text-primary' },
    confirmed: { label: locale === 'en' ? 'Confirmed' : 'Bestätigt', icon: CheckCircle, color: 'text-chart-3' },
    in_progress: { label: locale === 'en' ? 'In Progress' : 'In Arbeit', icon: Play, color: 'text-accent' },
    completed: { label: locale === 'en' ? 'Completed' : 'Abgeschlossen', icon: CheckCircle, color: 'text-chart-3' },
    cancelled: { label: locale === 'en' ? 'Cancelled' : 'Abgebrochen', icon: Clock, color: 'text-destructive' }
  }

  const activeJobs = safeJobs.filter(j =>
    ['pending', 'scheduled', 'confirmed', 'in_progress'].includes(j.status)
  )

  const handleStatusChange = async (jobId: string, status: string) => {
    if (!onUpdateStatus) return
    setLoadingJob(jobId)
    await onUpdateStatus(jobId, status)
    setLoadingJob(null)
    onRefresh()
  }

  const handleEdit = (job: Job) => {
    setEditingId(job.id)
    setEditData({ ...job })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleSave = async (jobId: string) => {
    setLoadingJob(jobId)
    try {
      const response = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, ...editData }),
      })

      if (!response.ok) throw new Error()

      toast.success(locale === 'en' ? 'Job updated' : 'Auftrag aktualisiert')
      setEditingId(null)
      onRefresh()
    } catch (err) {
      toast.error(locale === 'en' ? 'Error saving changes' : 'Fehler beim Speichern')
    } finally {
      setLoadingJob(null)
    }
  }

  const handleSendMessage = async (jobId: string, template: string) => {
    if (!onSendMessage) return
    setLoadingAction(`${jobId}-${template}`)
    await onSendMessage(jobId, template)
    setLoadingAction(null)
    onRefresh()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return locale === 'en' ? 'Not scheduled' : 'Nicht geplant'
    return new Date(dateString).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          {locale === 'en' ? 'Active Jobs' : 'Aktive Aufträge'}
        </CardTitle>
        <CardDescription>
          {activeJobs.length} {locale === 'en' ? 'jobs in progress' : 'Aufträge in Bearbeitung'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mb-2" />
            <p>{locale === 'en' ? 'No active jobs' : 'Keine aktiven Aufträge'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => {
              const StatusIcon = statusConfig[job.status]?.icon || Clock
              const isEditing = editingId === job.id

              return (
                <div
                  key={job.id}
                  className={cn(
                    "rounded-lg border bg-card p-4 transition-colors",
                    isEditing ? "border-primary ring-1 ring-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!isEditing && <StatusIcon className={`h-4 w-4 ${statusConfig[job.status]?.color}`} />}
                        <span className="font-medium">
                          {job.lead?.name || (locale === 'en' ? 'Unknown' : 'Unbekannt')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {job.lead?.job_type || (locale === 'en' ? 'General' : 'Allgemein')}
                        </Badge>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 mt-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">
                              {locale === 'en' ? 'Notes' : 'Notizen'}
                            </label>
                            <Textarea
                              value={editData.notes || ''}
                              onChange={e => setEditData({ ...editData, notes: e.target.value })}
                              className="min-h-[60px] text-xs h-16"
                              placeholder={locale === 'en' ? 'Job notes...' : 'Auftragsnotizen...'}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">
                                {locale === 'en' ? 'Appointment' : 'Termin'}
                              </label>
                              <Input
                                type="datetime-local"
                                value={editData.scheduled_time ? new Date(editData.scheduled_time).toISOString().slice(0, 16) : ''}
                                onChange={e => setEditData({ ...editData, scheduled_time: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">
                                {locale === 'en' ? 'Duration (Min)' : 'Dauer (Min)'}
                              </label>
                              <Input
                                type="number"
                                value={editData.estimated_duration || 60}
                                onChange={e => setEditData({ ...editData, estimated_duration: parseInt(e.target.value) })}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {job.notes || job.lead?.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{job.technician?.name || (locale === 'en' ? 'Not assigned' : 'Nicht zugewiesen')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="text-xs">{formatDate(job.scheduled_time)}</span>
                            </div>
                            {job.review_received && job.review_rating && (
                              <div className="flex items-center gap-1 text-accent">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                <span>{job.review_rating}/5</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleCancel}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="icon" className="h-8 w-8" onClick={() => handleSave(job.id)} disabled={loadingJob === job.id}>
                              {loadingJob === job.id ? <Spinner className="h-3 w-3" /> : <Save className="h-4 w-4" />}
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(job)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <Select
                        value={job.status}
                        onValueChange={(v) => handleStatusChange(job.id, v)}
                        disabled={loadingJob === job.id || !canManageJobs}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          {loadingJob === job.id ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {!isEditing && canManageJobs && onSendMessage && (
                        <div className="flex justify-end gap-1 mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-primary"
                            onClick={() => handleSendMessage(job.id, 'confirmation')}
                            disabled={loadingAction === `${job.id}-confirmation`}
                            title={locale === 'en' ? 'Send confirmation' : 'Bestätigung senden'}
                          >
                            {loadingAction === `${job.id}-confirmation` ? (
                              <Spinner className="h-3 w-3" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {job.status === 'completed' && !job.review_requested && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-accent"
                              onClick={() => handleSendMessage(job.id, 'review_request')}
                              disabled={loadingAction === `${job.id}-review_request`}
                              title={locale === 'en' ? 'Request review' : 'Bewertung anfragen'}
                            >
                              {loadingAction === `${job.id}-review_request` ? (
                                <Spinner className="h-3 w-3" />
                              ) : (
                                <Star className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
