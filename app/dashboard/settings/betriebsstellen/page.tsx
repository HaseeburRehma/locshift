'use client'

/**
 * Betriebsstellen admin page — Phase 3 / CR #1 (Rheinmaasrail).
 *
 * Admin + dispatcher CRUD for operational_locations. The whole org
 * reads from the selector components, so this page is the single write
 * surface.
 *
 * Copy is German-first; Rheinmaasrail's entire UI is DE and they
 * specifically wanted "Betriebsstellen" as the user-visible term.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Plus, Trash2, Edit2, ChevronLeft, MapPin, Power, PowerOff, Building2, Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useUser } from '@/lib/user-context'
import { useOperationalLocations } from '@/hooks/useOperationalLocations'
import type { OperationalLocation, OperationalLocationType } from '@/lib/types'

const TYPE_OPTIONS: { value: OperationalLocationType; label: string }[] = [
  { value: 'depot',    label: 'Depot' },
  { value: 'station',  label: 'Bahnhof' },
  { value: 'yard',     label: 'Abstellanlage' },
  { value: 'workshop', label: 'Werkstatt' },
  { value: 'office',   label: 'Büro' },
  { value: 'other',    label: 'Sonstige' },
]

type FormState = {
  name: string
  short_code: string
  type: OperationalLocationType
  address: string
  phone_number: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  short_code: '',
  type: 'depot',
  address: '',
  phone_number: '',
  notes: '',
}

export default function BetriebsstellenPage() {
  const { isAdmin, isDispatcher, isLoading: userLoading } = useUser()
  const {
    locations, loading, createLocation, updateLocation, toggleActive, deleteLocation,
  } = useOperationalLocations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<OperationalLocation | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // RBAC: only admin or dispatcher may manage Betriebsstellen
  if (!userLoading && !isAdmin && !isDispatcher) redirect('/dashboard')

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (loc: OperationalLocation) => {
    setEditing(loc)
    setForm({
      name: loc.name,
      short_code: loc.short_code ?? '',
      type: loc.type,
      address: loc.address ?? '',
      phone_number: loc.phone_number ?? '',
      notes: loc.notes ?? '',
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    const payload = {
      name,
      short_code: form.short_code.trim() || null,
      type: form.type,
      address: form.address.trim() || null,
      phone_number: form.phone_number.trim() || null,
      notes: form.notes.trim() || null,
    }
    let result = null
    if (editing) {
      result = await updateLocation(editing.id, payload)
    } else {
      result = await createLocation(payload)
    }
    setSaving(false)
    if (result) {
      setFormOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    }
  }

  const handleDelete = async (loc: OperationalLocation) => {
    const confirmed = window.confirm(
      `Betriebsstelle „${loc.name}" wirklich löschen? Bestehende Einsätze verlieren die Verknüpfung, bleiben aber erhalten.`,
    )
    if (!confirmed) return
    await deleteLocation(loc.id)
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
          Lade Betriebsstellen…
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors group"
          >
            <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
            Einstellungen
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl">
                <Building2 className="h-6 w-6" />
              </div>
              Betriebsstellen
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Verwalten Sie die Start- und Zielorte Ihrer Schichten —
              Depots, Bahnhöfe, Werkstätten und weitere feste Standorte.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="rounded-2xl bg-blue-600 font-bold uppercase tracking-widest text-[11px] h-12 px-6 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 group"
        >
          <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Neue Betriebsstelle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map(loc => {
          const typeLabel = TYPE_OPTIONS.find(t => t.value === loc.type)?.label ?? loc.type
          return (
            <div
              key={loc.id}
              className={`group bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all border-l-[6px] ${
                loc.is_active ? 'border-l-blue-600' : 'border-l-slate-300 opacity-70'
              }`}
            >
              <div className="flex flex-col h-full space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 leading-none truncate">
                      {loc.name}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60">
                      {typeLabel}
                      {loc.short_code ? ` · ${loc.short_code}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(loc.id, loc.is_active)}
                      className="h-8 w-8 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                      aria-label={loc.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {loc.is_active
                        ? <PowerOff className="h-3.5 w-3.5" />
                        : <Power className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(loc)}
                      className="h-8 w-8 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                      aria-label="Bearbeiten"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(loc)}
                      className="h-8 w-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500"
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-50 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {loc.address || (
                        <span className="text-slate-400 italic font-medium">
                          Keine Adresse hinterlegt
                        </span>
                      )}
                    </p>
                  </div>

                  {loc.phone_number && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                        <Phone className="h-4 w-4" />
                      </div>
                      <a
                        href={`tel:${loc.phone_number.replace(/\s+/g, '')}`}
                        className="text-sm font-semibold text-slate-800 leading-snug hover:text-emerald-600 transition-colors"
                      >
                        {loc.phone_number}
                      </a>
                    </div>
                  )}
                </div>

                {loc.notes && (
                  <p className="text-sm text-slate-500 font-medium leading-relaxed italic">
                    {loc.notes}
                  </p>
                )}

                <div className="pt-2 mt-auto flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${loc.is_active ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {loc.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                    Aktualisiert: {new Date(loc.updated_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {locations.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50/30 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-[2rem] bg-white text-slate-300 flex items-center justify-center shadow-sm">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900">Noch keine Betriebsstellen angelegt</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Legen Sie Depots, Bahnhöfe oder weitere Standorte an.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={openCreate}
              className="rounded-xl border-slate-200 font-bold uppercase tracking-widest text-[10px] h-10 px-6 hover:bg-white"
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> Erste Betriebsstelle anlegen
            </Button>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Betriebsstelle bearbeiten' : 'Neue Betriebsstelle'}
            </DialogTitle>
            <DialogDescription>
              Diese Standorte stehen als Start- und Zielort bei der
              Schichtplanung zur Verfügung.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
                Name*
              </Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z. B. Hauptdepot Köln"
                className="h-12 rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
                Kurzcode
              </Label>
              <Input
                value={form.short_code}
                onChange={e => setForm(f => ({ ...f, short_code: e.target.value }))}
                placeholder="z. B. RM-DEP-01"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
                Typ
              </Label>
              <Select
                value={form.type}
                onValueChange={(v: OperationalLocationType) => setForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="font-semibold py-2.5 rounded-xl">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
                Adresse
              </Label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Straße, PLZ Ort"
                className="h-12 rounded-xl"
              />
            </div>

            {/* CR #1 follow-up — optional contact phone for the Betriebsstelle */}
            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
                Telefon (optional)
              </Label>
              <Input
                value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                placeholder="z. B. +49 30 12345678"
                type="tel"
                inputMode="tel"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-semibold uppercase text-gray-500 tracking-widest">
                Notizen
              </Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optionale Hinweise für Disponenten"
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Speichert…' : editing ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
