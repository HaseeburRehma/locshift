'use client'

/**
 * Abrechnungsdaten eines Mitarbeiters (billing spec sections 2, 3 and 5):
 *   - Bundesland → which public holidays get the holiday surcharge
 *   - regulärer Bruttostundenlohn → basis of every surcharge in euros
 *   - Gastfahrt-Stundenlohn → Gastfahrten are paid separately
 * Wages are dated: a shift is paid with the rate valid on its start day, so
 * a raise never changes months that are already settled.
 * Only admins see and edit wages (RLS on employee_pay_rates).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Euro, Loader2, MapPinned, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { GERMAN_STATES, stateName } from '@/lib/time/holidays'
import { formatDateDE, formatEuro } from '@/lib/time/format'
import { localDateKey } from '@/lib/time/shift-hours'
import { useConfirm } from '@/components/shared/ConfirmDialog'

interface PayRateRow {
  id: string
  valid_from: string
  hourly_wage: number | null
  guest_hourly_wage: number | null
  note: string | null
}

function parseEuro(v: string): number | null {
  const s = v.trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

export function PayAndStateCard({ employeeId, organizationId }: { employeeId: string; organizationId: string | null }) {
  const { isAdmin } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const confirm = useConfirm()
  const supabase = useRef(createClient()).current

  const [state, setState] = useState<string | null>(null)
  const [savingState, setSavingState] = useState(false)
  const [rates, setRates] = useState<PayRateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [form, setForm] = useState({ validFrom: localDateKey(), wage: '', guest: '', note: '' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const prof = await supabase.from('profiles').select('federal_state').eq('id', employeeId).maybeSingle()
    setState(prof.error ? null : (prof.data?.federal_state ?? 'NW'))
    if (isAdmin) {
      const { data, error } = await supabase
        .from('employee_pay_rates')
        .select('id, valid_from, hourly_wage, guest_hourly_wage, note')
        .eq('employee_id', employeeId)
        .order('valid_from', { ascending: false })
      if (error) {
        setRatesError(error.message)
        setRates([])
      } else {
        setRatesError(null)
        setRates(((data ?? []) as PayRateRow[]).map((r) => ({
          ...r,
          hourly_wage: r.hourly_wage == null ? null : Number(r.hourly_wage),
          guest_hourly_wage: r.guest_hourly_wage == null ? null : Number(r.guest_hourly_wage),
        })))
      }
    }
    setLoading(false)
  }, [supabase, employeeId, isAdmin])

  useEffect(() => { void load() }, [load])

  const changeState = async (next: string) => {
    const prev = state
    setState(next)
    setSavingState(true)
    const { error } = await supabase.from('profiles').update({ federal_state: next }).eq('id', employeeId)
    setSavingState(false)
    if (error) {
      setState(prev)
      toast.error(L('Bundesland konnte nicht gespeichert werden', 'Could not save the federal state'))
    } else {
      toast.success(L(`Bundesland: ${stateName(next)}`, `Federal state: ${stateName(next)}`))
    }
  }

  const wage = parseEuro(form.wage)
  const guest = parseEuro(form.guest)
  const formError = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.validFrom)) return L('Gültig ab fehlt', 'Valid from is missing')
    if (Number.isNaN(wage) || Number.isNaN(guest)) return L('Bitte Beträge wie 18,50 eingeben', 'Enter amounts like 18.50')
    if (wage == null && guest == null) return L('Mindestens einen Stundenlohn eingeben', 'Enter at least one hourly wage')
    if ((wage != null && (wage <= 0 || wage > 1000)) || (guest != null && (guest <= 0 || guest > 1000))) return L('Stundenlohn zwischen 0,01 und 1.000 €', 'Hourly wage between 0.01 and 1,000 €')
    return null
  }, [form.validFrom, wage, guest, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  const addRate = async () => {
    if (formError || !organizationId) return
    const existing = rates.find((r) => r.valid_from === form.validFrom)
    if (existing) {
      const ok = await confirm({
        title: L('Stundenlohn ersetzen?', 'Replace hourly wage?'),
        details: [L(`Für den ${formatDateDE(form.validFrom)} ist bereits ein Satz hinterlegt.`, `A rate for ${form.validFrom} exists already.`)],
        confirmLabel: L('Ersetzen', 'Replace'),
        cancelLabel: L('Abbrechen', 'Cancel'),
      })
      if (!ok) return
    }
    setAdding(true)
    const { error } = await supabase.from('employee_pay_rates').upsert(
      {
        organization_id: organizationId,
        employee_id: employeeId,
        valid_from: form.validFrom,
        hourly_wage: wage,
        guest_hourly_wage: guest,
        note: form.note.trim() || null,
      },
      { onConflict: 'employee_id,valid_from' },
    )
    setAdding(false)
    if (error) {
      toast.error(L('Stundenlohn konnte nicht gespeichert werden', 'Could not save the hourly wage'))
      return
    }
    toast.success(L('Stundenlohn gespeichert', 'Hourly wage saved'))
    setForm({ validFrom: localDateKey(), wage: '', guest: '', note: '' })
    void load()
  }

  const removeRate = async (r: PayRateRow) => {
    const ok = await confirm({
      title: L('Stundenlohn löschen?', 'Delete hourly wage?'),
      details: [`${L('Gültig ab', 'Valid from')} ${formatDateDE(r.valid_from)}`],
      note: L('Monatsnachweise ab diesem Datum rechnen dann mit dem vorherigen Satz.', 'Statements from this date then use the previous rate.'),
      confirmLabel: L('Löschen', 'Delete'),
      cancelLabel: L('Abbrechen', 'Cancel'),
      destructive: true,
    })
    if (!ok) return
    const { error } = await supabase.from('employee_pay_rates').delete().eq('id', r.id)
    if (error) toast.error(L('Löschen fehlgeschlagen', 'Delete failed'))
    else void load()
  }

  const today = localDateKey()
  const current = rates.find((r) => r.valid_from <= today) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#0064E0]">
          <MapPinned className="w-4 h-4" /> {L('Bundesland (Feiertage)', 'Federal state (holidays)')}
        </h3>
        {loading && state == null ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : state == null ? (
          <p className="text-xs text-slate-500">{L('Noch nicht verfügbar – Datenbank-Update ausstehend.', 'Not available yet – database update pending.')}</p>
        ) : isAdmin ? (
          <Select value={state} onValueChange={changeState} disabled={savingState}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GERMAN_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm font-bold text-slate-900">{stateName(state)}</p>
        )}
        <p className="text-xs text-slate-500">
          {L('Feiertagszuschlag (50 %) gilt für die gesetzlichen Feiertage dieses Bundeslands.', 'The holiday premium (50 %) applies to the public holidays of this state.')}
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#0064E0]">
            <Euro className="w-4 h-4" /> {L('Stundenlöhne (nur für Admins sichtbar)', 'Hourly wages (admins only)')}
          </h3>
          {ratesError ? (
            <p className="text-xs text-amber-700">{L('Stundenlöhne sind erst nach dem Datenbank-Update verfügbar.', 'Hourly wages become available after the database update.')}</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {L(
                  'Regulärer Bruttostundenlohn = Basis aller Zuschläge. Gastfahrten werden mit dem Gastfahrt-Stundenlohn vergütet. Ein neuer Satz gilt ab dem gewählten Tag; jede Schicht wird mit dem Satz ihres Beginntags gerechnet.',
                  'Regular gross hourly wage = basis of all premiums. Gastfahrten are paid with the Gastfahrt wage. A new rate applies from the chosen day; each shift uses the rate of its start day.',
                )}
              </p>
              {current && (
                <p className="text-sm font-bold text-slate-900">
                  {L('Aktuell', 'Current')}: {current.hourly_wage != null ? formatEuro(current.hourly_wage, locale) : '–'} · Gastfahrt {current.guest_hourly_wage != null ? formatEuro(current.guest_hourly_wage, locale) : '–'}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-4 items-end">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">{L('Gültig ab', 'Valid from')}</Label>
                  <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">{L('Stundenlohn (€)', 'Hourly wage (€)')}</Label>
                  <Input inputMode="decimal" placeholder="18,50" value={form.wage} onChange={(e) => setForm({ ...form, wage: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">{L('Gastfahrt (€/Std.)', 'Gastfahrt (€/h)')}</Label>
                  <Input inputMode="decimal" placeholder="12,00" value={form.guest} onChange={(e) => setForm({ ...form, guest: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <Button onClick={addRate} disabled={!!formError || adding} className="h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-bold">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />{L('Speichern', 'Save')}</>}
                </Button>
              </div>
              {formError && (form.wage || form.guest) && <p className="text-xs font-semibold text-amber-700">{formError}</p>}
              {rates.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-2 text-left font-black">{L('Gültig ab', 'Valid from')}</th>
                      <th className="py-2 text-right font-black">{L('Stundenlohn', 'Hourly wage')}</th>
                      <th className="py-2 text-right font-black">Gastfahrt</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-2 font-semibold tabular-nums">{formatDateDE(r.valid_from)}</td>
                        <td className="py-2 text-right tabular-nums">{r.hourly_wage != null ? formatEuro(r.hourly_wage, locale) : '–'}</td>
                        <td className="py-2 text-right tabular-nums">{r.guest_hourly_wage != null ? formatEuro(r.guest_hourly_wage, locale) : '–'}</td>
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => removeRate(r)} aria-label={L('Löschen', 'Delete')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
