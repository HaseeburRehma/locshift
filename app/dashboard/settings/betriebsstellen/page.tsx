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

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Plus, Trash2, Edit2, ChevronLeft, Power, PowerOff, Building2, Phone, Search, Upload,
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
import { LocationImportDialog } from '@/components/locations/LocationImportDialog'
import { searchLocations } from '@/lib/operational-locations/parse'

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
    locations, loading, createLocation, updateLocation, toggleActive, deleteLocation, importLocations,
  } = useOperationalLocations()

  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(true)
  const [page, setPage] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const PAGE_SIZE = 50
  const filtered = useMemo(() => {
    const base = showInactive ? locations : locations.filter((l) => l.is_active)
    return query.trim() ? searchLocations(base, query, 5000) : base
  }, [locations, query, showInactive])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const shown = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0064E0] flex items-center gap-4">
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

        <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setImportOpen(true)}
          className="rounded-2xl font-bold uppercase tracking-widest text-[11px] h-12 px-6"
        >
          <Upload className="h-4 w-4 mr-2" />
          Importieren
        </Button>
        <Button
          onClick={openCreate}
          className="rounded-2xl bg-blue-600 font-bold uppercase tracking-widest text-[11px] h-12 px-6 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 group"
        >
          <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Neue Betriebsstelle
        </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0) }}
            placeholder="Suchen nach Name, Namensteil oder Kürzel …"
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 px-1">
          <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setPage(0) }} />
          Inaktive anzeigen
        </label>
        <span className="self-center text-xs font-bold text-slate-400">{filtered.length} von {locations.length}</span>
      </div>

      {locations.length === 0 ? (
        <div className="py-16 bg-slate-50/30 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
          <Building2 className="h-8 w-8 text-slate-300" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Noch keine Betriebsstellen angelegt</p>
            <p className="text-xs font-semibold text-slate-400">Importieren Sie das Betriebsstellenverzeichnis (PDF/CSV/Excel) oder legen Sie Standorte einzeln an.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white font-bold text-xs h-10 px-5">
              <Upload className="h-3.5 w-3.5" /> Importieren
            </button>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white text-blue-700 font-bold text-xs h-10 px-5">
              <Plus className="h-3.5 w-3.5" /> Einzeln anlegen
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-black">Kürzel</th>
                  <th className="px-4 py-3 text-left font-black">Name</th>
                  <th className="px-4 py-3 text-left font-black">Art</th>
                  <th className="px-4 py-3 text-left font-black">Adresse / Telefon</th>
                  <th className="px-4 py-3 text-left font-black">Status</th>
                  <th className="px-4 py-3 text-right font-black">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((loc) => (
                  <tr key={loc.id} className={`border-t border-slate-100 ${loc.is_active ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-2.5 font-mono text-xs font-black text-slate-700">{loc.short_code || '—'}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{loc.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{TYPE_OPTIONS.find((t) => t.value === loc.type)?.label ?? loc.type}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {loc.address || '—'}
                      {loc.phone_number && (
                        <a href={`tel:${loc.phone_number.replace(/\s+/g, '')}`} className="ml-2 inline-flex items-center gap-1 text-emerald-700 hover:underline">
                          <Phone className="h-3 w-3" /> {loc.phone_number}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${loc.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>{loc.is_active ? 'Aktiv' : 'Inaktiv'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(loc.id, loc.is_active)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600" aria-label={loc.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                          {loc.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(loc)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600" aria-label="Bearbeiten">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(loc)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500" aria-label="Löschen">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">Keine Treffer für „{query}“.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <Button variant="outline" size="sm" className="rounded-lg" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Zurück</Button>
              <span className="text-xs font-bold text-slate-500">Seite {page + 1} von {pages}</span>
              <Button variant="outline" size="sm" className="rounded-lg" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
            </div>
          )}
        </div>
      )}

      <LocationImportDialog open={importOpen} onOpenChange={setImportOpen} existing={locations} onImport={importLocations} />

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
