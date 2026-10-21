'use client'

/**
 * Betriebsstellen-Import (Kundenfeedback Punkt 12): PDF, CSV/Excel or
 * pasted text → preview with correction → duplicates detected → import.
 * Nothing is saved before "Importieren".
 */

import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardPaste, FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { OperationalLocation, OperationalLocationType } from '@/lib/types'
import { checkRows, parseLocationText, type ParsedLocation } from '@/lib/operational-locations/parse'
import { extractPdfText } from '@/lib/pdf/extract-text'

const TYPES: { value: OperationalLocationType; de: string; en: string }[] = [
  { value: 'station', de: 'Bahnhof / Haltepunkt', en: 'Station' },
  { value: 'yard', de: 'Abstellanlage / Gbf', en: 'Yard' },
  { value: 'depot', de: 'Depot', en: 'Depot' },
  { value: 'workshop', de: 'Werkstatt', en: 'Workshop' },
  { value: 'office', de: 'Büro', en: 'Office' },
  { value: 'other', de: 'Sonstige', en: 'Other' },
]
const PAGE = 50

interface Row extends ParsedLocation {
  include: boolean
  updateExisting: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: OperationalLocation[]
  onImport: (
    inserts: { name: string; short_code: string | null; type: OperationalLocationType; notes: string | null }[],
    updates: { id: string; patch: { name?: string; short_code?: string | null; type?: OperationalLocationType } }[],
  ) => Promise<{ inserted: number; updated: number; failed: string[] }>
}

async function excelToText(file: File): Promise<string> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  const lines: string[] = []
  ws?.eachRow((row) => {
    const values = (row.values as unknown[]).slice(1).map((v) => (v == null ? '' : String(typeof v === 'object' && v && 'text' in v ? (v as { text: string }).text : v)))
    lines.push(values.join(';'))
  })
  return lines.join('\n')
}

export function LocationImportDialog({ open, onOpenChange, existing, onImport }: Props) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [step, setStep] = useState<'source' | 'preview'>('source')
  const [paste, setPaste] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'dup' | 'invalid'>('all')
  const [page, setPage] = useState(0)
  const [sourceName, setSourceName] = useState('')

  const reset = () => {
    setStep('source')
    setPaste('')
    setRows([])
    setFilter('all')
    setPage(0)
    setBusy(null)
  }

  const load = (text: string, name: string) => {
    const parsed = parseLocationText(text)
    if (parsed.length === 0) {
      toast.error(L('In der Datei wurden keine Betriebsstellen erkannt.', 'No locations were recognised in the file.'))
      return
    }
    const checks = checkRows(parsed, existing)
    setRows(
      parsed.map((r) => {
        const c = checks.get(r.key)
        return { ...r, include: c?.kind === 'new', updateExisting: false }
      }),
    )
    setSourceName(name)
    setStep('preview')
    setPage(0)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setBusy(L('PDF wird gelesen …', 'Reading PDF …'))
        const text = await extractPdfText(file, (p, n) => setBusy(L(`PDF wird gelesen … Seite ${p}/${n}`, `Reading PDF … page ${p}/${n}`)))
        load(text, file.name)
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        setBusy(L('Excel wird gelesen …', 'Reading Excel …'))
        load(await excelToText(file), file.name)
      } else {
        load(await file.text(), file.name)
      }
    } catch (e) {
      console.error('[LocationImport]', e)
      toast.error(L('Datei konnte nicht gelesen werden.', 'Could not read the file.'))
    } finally {
      setBusy(null)
    }
  }

  const checks = useMemo(() => checkRows(rows, existing), [rows, existing])
  const counts = useMemo(() => {
    let n = 0, d = 0, i = 0
    for (const r of rows) {
      const k = checks.get(r.key)?.kind
      if (k === 'new') n++
      else if (k === 'invalid') i++
      else d++
    }
    return { n, d, i }
  }, [rows, checks])

  const visible = rows.filter((r) => {
    const k = checks.get(r.key)?.kind
    if (filter === 'new') return k === 'new'
    if (filter === 'dup') return k === 'duplicate_existing' || k === 'duplicate_in_file'
    if (filter === 'invalid') return k === 'invalid'
    return true
  })
  const pages = Math.max(1, Math.ceil(visible.length / PAGE))
  const shown = visible.slice(page * PAGE, page * PAGE + PAGE)

  const patch = (key: string, p: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const toInsert = rows.filter((r) => r.include && checks.get(r.key)?.kind === 'new')
  const toUpdate = rows.filter((r) => r.include && r.updateExisting && checks.get(r.key)?.kind === 'duplicate_existing')

  const runImport = async () => {
    setBusy(L('Import läuft …', 'Importing …'))
    const result = await onImport(
      toInsert.map((r) => ({
        name: r.name.trim(),
        short_code: r.code.trim() || null,
        type: r.type,
        notes: r.typeText ? `Art: ${r.typeText}${sourceName ? ` · Import ${sourceName}` : ''}` : sourceName ? `Import ${sourceName}` : null,
      })),
      toUpdate.map((r) => {
        const c = checks.get(r.key)
        const id = c?.kind === 'duplicate_existing' ? (c.existing as OperationalLocation).id : ''
        return { id, patch: { name: r.name.trim(), short_code: r.code.trim() || null, type: r.type } }
      }).filter((u) => u.id),
    )
    setBusy(null)
    if (result.failed.length) {
      toast.warning(L(`${result.inserted} importiert, ${result.updated} aktualisiert, ${result.failed.length} fehlgeschlagen: ${result.failed.slice(0, 5).join(', ')}`, `${result.inserted} imported, ${result.updated} updated, ${result.failed.length} failed`))
    } else {
      toast.success(L(`${result.inserted} Betriebsstellen importiert, ${result.updated} aktualisiert`, `${result.inserted} locations imported, ${result.updated} updated`))
    }
    reset()
    onOpenChange(false)
  }

  const statusChip = (r: Row) => {
    const c = checks.get(r.key)
    if (!c) return null
    if (c.kind === 'new') return <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-700">{L('Neu', 'New')}</span>
    if (c.kind === 'invalid') return <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-red-700">{c.reason}</span>
    if (c.kind === 'duplicate_in_file') return <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-800">{L('Doppelt in Datei', 'Duplicate in file')}</span>
    return (
      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-800" title={c.existing.name}>
        {L('Vorhanden', 'Exists')} ({c.by === 'code' ? L('Kürzel', 'code') : 'Name'}: {c.existing.short_code ? `${c.existing.short_code} · ` : ''}{c.existing.name})
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="max-w-5xl rounded-[2rem] p-6 md:p-8 max-h-[94vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-2xl font-black tracking-tight">{L('Betriebsstellen importieren', 'Import operational locations')}</DialogTitle>
          <DialogDescription>
            {step === 'source'
              ? L('PDF-Verzeichnis, CSV/Excel-Datei oder kopierten Text verwenden. Vor dem Import sehen und korrigieren Sie jede Zeile.', 'Use the PDF list, a CSV/Excel file or pasted text. You can review and correct every row before importing.')
              : L(`${rows.length} Zeilen aus „${sourceName}“ erkannt.`, `${rows.length} rows recognised in "${sourceName}".`)}
          </DialogDescription>
        </DialogHeader>

        {busy && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-blue-50 p-6 text-sm font-bold text-blue-800">
            <Loader2 className="w-5 h-5 animate-spin" /> {busy}
          </div>
        )}

        {!busy && step === 'source' && (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-blue-300 hover:bg-blue-50/30">
              <Upload className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-black text-slate-800">{L('Datei auswählen', 'Choose file')}</span>
              <span className="text-xs text-slate-500">PDF, CSV, TXT {L('oder', 'or')} Excel (.xlsx)</span>
              <input type="file" accept=".pdf,.csv,.txt,.xlsx,application/pdf,text/csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-black text-slate-800"><ClipboardPaste className="w-4 h-4" /> {L('Text einfügen', 'Paste text')}</p>
              <Textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={'KAW   Aachen West   Bf\nKK    Köln Hbf      Bf\nKKAN  Köln-Kalk Nord Hp'}
                className="min-h-[160px] rounded-xl font-mono text-xs"
              />
              <Button disabled={!paste.trim()} onClick={() => load(paste, L('eingefügter Text', 'pasted text'))} className="rounded-xl font-bold">
                <FileText className="w-4 h-4 mr-2" /> {L('Vorschau erstellen', 'Create preview')}
              </Button>
            </div>
          </div>
        )}

        {!busy && step === 'preview' && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ['all', L('Alle', 'All'), rows.length],
                ['new', L('Neu', 'New'), counts.n],
                ['dup', L('Dubletten', 'Duplicates'), counts.d],
                ['invalid', L('Fehler', 'Errors'), counts.i],
              ] as const).map(([k, label, n]) => (
                <button
                  key={k}
                  onClick={() => { setFilter(k); setPage(0) }}
                  className={cn('rounded-full border px-3 py-1 text-xs font-bold', filter === k ? 'border-[#0064E0] bg-[#0064E0] text-white' : 'border-slate-200 text-slate-500')}
                >
                  {label} <span className="opacity-70">{n}</span>
                </button>
              ))}
              <span className="ml-auto text-xs font-semibold text-slate-500">
                {L(`${toInsert.length} neu · ${toUpdate.length} aktualisieren`, `${toInsert.length} new · ${toUpdate.length} update`)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-black">{L('Übernehmen', 'Use')}</th>
                    <th className="px-3 py-2 text-left font-black">{L('Kürzel', 'Code')}</th>
                    <th className="px-3 py-2 text-left font-black">Name</th>
                    <th className="px-3 py-2 text-left font-black">{L('Art', 'Type')}</th>
                    <th className="px-3 py-2 text-left font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const c = checks.get(r.key)
                    const dupExisting = c?.kind === 'duplicate_existing'
                    return (
                      <tr key={r.key} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={r.include && (c?.kind === 'new' || (dupExisting && r.updateExisting))}
                            disabled={c?.kind === 'invalid' || c?.kind === 'duplicate_in_file'}
                            onChange={(e) => patch(r.key, dupExisting ? { include: e.target.checked, updateExisting: e.target.checked } : { include: e.target.checked })}
                            aria-label={L('Zeile übernehmen', 'Use row')}
                          />
                          {dupExisting && <p className="mt-1 text-[10px] text-slate-400">{L('= aktualisieren', '= update')}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <input value={r.code} onChange={(e) => patch(r.key, { code: e.target.value.toUpperCase() })} className="h-8 w-24 rounded-lg border border-slate-200 px-2 font-mono text-xs font-bold" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} className="h-8 w-full min-w-[220px] rounded-lg border border-slate-200 px-2 text-sm font-semibold" />
                          <p className="mt-0.5 truncate text-[10px] text-slate-400 font-mono" title={r.raw}>{r.raw}</p>
                        </td>
                        <td className="px-3 py-2">
                          <select value={r.type} onChange={(e) => patch(r.key, { type: e.target.value as OperationalLocationType })} className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold">
                            {TYPES.map((t) => <option key={t.value} value={t.value}>{locale === 'de' ? t.de : t.en}</option>)}
                          </select>
                          {r.typeText && <p className="mt-0.5 text-[10px] text-slate-400">{L('aus Datei', 'from file')}: {r.typeText}</p>}
                        </td>
                        <td className="px-3 py-2">{statusChip(r)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs font-bold text-slate-500">{page + 1} / {pages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}

            {counts.d > 0 && (
              <p className="flex items-start gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {L('Bereits vorhandene Betriebsstellen werden übersprungen – anhaken, um sie mit den Werten aus der Datei zu aktualisieren.', 'Existing locations are skipped – tick them to update them with the values from the file.')}
              </p>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="ghost" className="rounded-xl font-bold" onClick={reset}>{L('Andere Datei', 'Other file')}</Button>
              <Button disabled={toInsert.length + toUpdate.length === 0} onClick={runImport} className="h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-black uppercase text-[11px] tracking-widest">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {L(`${toInsert.length + toUpdate.length} importieren`, `Import ${toInsert.length + toUpdate.length}`)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
