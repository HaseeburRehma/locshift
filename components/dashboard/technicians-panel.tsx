'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Wrench, MapPin, CheckCircle, XCircle, Edit2, Save, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import type { Technician, Job } from '@/lib/types'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface TechniciansPanelProps {
  technicians: Technician[]
  jobs: Job[]
  onRefresh?: () => void
}

export function TechniciansPanel({ technicians, jobs, onRefresh }: TechniciansPanelProps) {
  const { t, locale } = useTranslation()
  // Defensive guards — API may return error objects on timeout
  const safeTechnicians = Array.isArray(technicians) ? technicians : []
  const safeJobs = Array.isArray(jobs) ? jobs : []
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Technician>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [newTechData, setNewTechData] = useState<Partial<Technician>>({
    name: '',
    phone: '',
    email: '',
    skills: [],
    service_area: [],
    is_available: true,
    is_active: true,
  })
  
  const handleCreateNew = async () => {
    if (!newTechData.name || !newTechData.phone) {
      toast.error(locale === 'en' ? 'Name and phone are required' : 'Name und Telefon sind erforderlich')
      return
    }
    setLoading('new')
    try {
      const response = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTechData),
      })

      if (!response.ok) throw new Error()

      toast.success(locale === 'en' ? 'Technician created' : 'Techniker erstellt')
      setIsNewDialogOpen(false)
      setNewTechData({
        name: '',
        phone: '',
        email: '',
        skills: [],
        service_area: [],
        is_available: true,
        is_active: true,
      })
      onRefresh?.()
    } catch (err) {
      toast.error(locale === 'en' ? 'Error creating technician' : 'Fehler beim Erstellen des Technikers')
    } finally {
      setLoading(null)
    }
  }

  const getActiveJobsCount = (techId: string) => {
    return safeJobs.filter(j =>
      j.technician_id === techId &&
      ['pending', 'scheduled', 'confirmed', 'in_progress'].includes(j.status)
    ).length
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Supabase may return arrays as strings (e.g. "Berlin,Hamburg") or actual arrays
  const toArray = (value: string | string[] | null | undefined): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    // Handle comma-separated strings
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }

  const handleEdit = (tech: Technician) => {
    setEditingId(tech.id)
    setEditData({ ...tech })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleSave = async (techId: string) => {
    setLoading(techId)
    try {
      const response = await fetch('/api/technicians', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: techId, ...editData }),
      })

      if (!response.ok) throw new Error()

      toast.success(locale === 'en' ? 'Technician updated' : 'Techniker aktualisiert')
      setEditingId(null)
      onRefresh?.()
    } catch (err) {
      toast.error(locale === 'en' ? 'Error saving changes' : 'Fehler beim Speichern')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {locale === 'en' ? 'Technicians' : 'Techniker'}
          </CardTitle>
          <CardDescription>
            {safeTechnicians.filter(t => t.is_available).length} {locale === 'en' ? 'of' : 'von'} {safeTechnicians.length} {locale === 'en' ? 'available' : 'verfügbar'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {locale === 'en' ? 'New' : 'Neu'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {safeTechnicians.map((tech) => {
            const isEditing = editingId === tech.id
            const activeJobs = getActiveJobsCount(tech.id)

            return (
              <div
                key={tech.id}
                className={cn(
                  "flex flex-col gap-3 p-3 rounded-lg border bg-card transition-all",
                  isEditing && "border-primary ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={tech.is_available ? 'bg-primary/10 text-primary' : 'bg-muted'}>
                      {getInitials(tech.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={editData.name || ''}
                          onChange={e => setEditData({ ...editData, name: e.target.value })}
                          className="h-7 text-sm font-medium"
                        />
                      ) : (
                        <span className="font-medium text-sm">{tech.name}</span>
                      )}
                      {!isEditing && (
                        tech.is_available ? (
                          <CheckCircle className="h-3.5 w-3.5 text-chart-3" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {isEditing ? (
                        <Input
                          value={toArray(editData.service_area).join(', ')}
                          onChange={e => setEditData({ ...editData, service_area: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          className="h-6 text-[10px]"
                          placeholder={locale === 'en' ? 'Areas (comma separated)' : 'Gebiete (mit Komma trennen)'}
                        />
                      ) : (
                        <span className="truncate">{toArray(tech.service_area).join(', ') || (locale === 'en' ? 'No area' : 'Kein Gebiet')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isEditing ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {locale === 'en' ? 'Available' : 'Verfügbar'}
                          </span>
                          <Switch
                            checked={editData.is_available}
                            onCheckedChange={v => setEditData({ ...editData, is_available: v })}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" className="h-7 w-7" onClick={() => handleSave(tech.id)} disabled={loading === tech.id}>
                            {loading === tech.id ? <Spinner className="h-3 w-3" /> : <Save className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/tech:opacity-100 transition-opacity" onClick={() => handleEdit(tech)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Badge
                            variant={tech.is_available ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {tech.is_available
                              ? (locale === 'en' ? 'Available' : 'Verfügbar')
                              : (locale === 'en' ? 'Busy' : 'Beschäftigt')}
                          </Badge>
                        </div>
                        {activeJobs > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {activeJobs} {locale === 'en' ? 'job' : 'Auftrag'}{activeJobs !== 1 ? (locale === 'en' ? 's' : 'e') : ''}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="pt-2 border-t border-border mt-1">
                    <span className="text-[10px] font-medium block mb-1">
                      {locale === 'en' ? 'Skills' : 'Fähigkeiten'}
                    </span>
                    <Input
                      value={toArray(editData.skills).join(', ')}
                      onChange={e => setEditData({ ...editData, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="h-6 text-[10px]"
                      placeholder={locale === 'en' ? 'Skills (comma separated)' : 'Fähigkeiten (mit Komma trennen)'}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{locale === 'en' ? 'New Technician' : 'Neuer Techniker'}</DialogTitle>
            <DialogDescription>
              {locale === 'en' ? 'Add a new technician to your team.' : 'Fügen Sie Ihrem Team einen neuen Techniker hinzu.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{locale === 'en' ? 'Name' : 'Name'} *</Label>
              <Input
                id="name"
                value={newTechData.name || ''}
                onChange={(e) => setNewTechData({ ...newTechData, name: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{locale === 'en' ? 'Phone' : 'Telefon'} *</Label>
              <Input
                id="phone"
                value={newTechData.phone || ''}
                onChange={(e) => setNewTechData({ ...newTechData, phone: e.target.value })}
                placeholder="+49 ..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{locale === 'en' ? 'Email' : 'E-Mail'}</Label>
              <Input
                id="email"
                type="email"
                value={newTechData.email || ''}
                onChange={(e) => setNewTechData({ ...newTechData, email: e.target.value })}
                placeholder="max@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="areas">{locale === 'en' ? 'Service Areas (comma separated)' : 'Einsatzgebiete (mit Komma trennen)'}</Label>
              <Input
                id="areas"
                value={toArray(newTechData.service_area).join(', ')}
                onChange={(e) => setNewTechData({ ...newTechData, service_area: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Berlin, Hamburg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">{locale === 'en' ? 'Skills (comma separated)' : 'Fähigkeiten (mit Komma trennen)'}</Label>
              <Input
                id="skills"
                value={toArray(newTechData.skills).join(', ')}
                onChange={(e) => setNewTechData({ ...newTechData, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Electrician, Plumbing"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Switch
                id="is_available"
                checked={newTechData.is_available}
                onCheckedChange={(checked) => setNewTechData({ ...newTechData, is_available: checked })}
              />
              <Label htmlFor="is_available">{locale === 'en' ? 'Available for new jobs' : 'Verfügbar für neue Aufträge'}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              {locale === 'en' ? 'Cancel' : 'Abbrechen'}
            </Button>
            <Button onClick={handleCreateNew} disabled={loading === 'new'}>
              {loading === 'new' && <Spinner className="mr-2 h-4 w-4" />}
              {locale === 'en' ? 'Create' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
