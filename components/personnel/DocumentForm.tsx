'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, FileUp, Loader2, Lock, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { DEFAULT_REMINDER_DAYS, DOC_TYPES, docTypeLabel, reminderLabel, type DocType, type PersonnelDocument } from '@/lib/personnel/documents'
import type { DocumentInput } from '@/hooks/personnel/usePersonnelDocuments'

const REMINDER_OPTIONS = [56, 28, 14, 7, 0]
const MAX_BYTES = 20 * 1024 * 1024
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/heic'

interface Props {
  employees: { id: string; full_name: string | null }[]
  initial?: PersonnelDocument | null
  /** Renewal: pre-fill from the old record, which gets archived on save. */
  renewOf?: PersonnelDocument | null
  defaultEmployeeId?: string
  onSubmit: (input: DocumentInput, file: File | null) => Promise<boolean>
  onCancel: () => void
}

export function DocumentForm({ employees, initial, renewOf, defaultEmployeeId, onSubmit, onCancel }: Props) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { isAdmin } = useUser()
  const base = initial ?? renewOf ?? null

  const [userId, setUserId] = useState(base?.user_id ?? defaultEmployeeId ?? '')
  const [docType, setDocType] = useState<string>(base?.doc_type ?? 'fitness')
  const [name, setName] = useState(base?.name ?? docTypeLabel('fitness', 'de'))
  const [issuer, setIssuer] = useState(base?.issuer ?? '')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [issuedAt, setIssuedAt] = useState(initial?.issued_at ?? '')
  const [expiresAt, setExpiresAt] = useState(initial?.expires_at ?? '')
  const [remark, setRemark] = useState(initial?.remark ?? '')
  const [reminders, setReminders] = useState<number[]>(base?.reminder_days?.length ? base.reminder_days : DEFAULT_REMINDER_DAYS)
  const [confidential, setConfidential] = useState(base?.is_confidential ?? false)
  const [required, setRequired] = useState(base?.is_required ?? (base?.doc_type ?? 'fitness') === 'fitness')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!base && !name.trim()) setName(docTypeLabel(docType, 'de'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType])

  const errors: string[] = []
  if (!userId) errors.push(L('Bitte einen Mitarbeiter wählen.', 'Please choose an employee.'))
  if (!name.trim()) errors.push(L('Bitte eine Bezeichnung angeben.', 'Please enter a title.'))
  if (issuedAt && expiresAt && expiresAt < issuedAt) errors.push(L('Das Ablaufdatum liegt vor dem Ausstellungsdatum.', 'Expiry date is before the issue date.'))
  if (file && file.size > MAX_BYTES) errors.push(L('Die Datei ist größer als 20 MB.', 'File is larger than 20 MB.'))
  if (renewOf && !expiresAt) errors.push(L('Bitte das neue Ablaufdatum angeben.', 'Please enter the new expiry date.'))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (errors.length) return
    setSaving(true)
    const ok = await onSubmit(
      {
        user_id: userId,
        name: name.trim(),
        doc_type: docType,
        issuer: issuer.trim() || null,
        reference: reference.trim() || null,
        issued_at: issuedAt || null,
        expires_at: expiresAt || null,
        remark: remark.trim() || null,
        reminder_days: [...reminders].sort((a, b) => b - a),
        is_confidential: confidential,
        is_required: required,
      },
      file,
    )
    setSaving(false)
    if (ok) onCancel()
  }

  const label = 'text-[10px] font-black uppercase tracking-widest text-slate-400'
  const field = 'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/10'

  return (
    <form onSubmit={submit} className="space-y-4">
      {renewOf && (
        <p className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs font-semibold text-blue-800">
          {L('Erneuerung: Der bisherige Nachweis wird archiviert, seine Erinnerungen sind damit erledigt.', 'Renewal: the previous record is archived and its reminders are closed.')}
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={label}>{L('Mitarbeiter', 'Employee')} *</span>
          <select className={field} value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!!initial || !!renewOf}>
            <option value="">{L('Bitte wählen …', 'Please choose …')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name ?? '—'}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>{L('Dokumentart', 'Document type')} *</span>
          <select className={field} value={docType} onChange={(e) => setDocType(e.target.value)}>
            {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
              <option key={t} value={t}>{docTypeLabel(t, locale)}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className={label}>{L('Bezeichnung', 'Title')} *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={label}>{L('Ausgestellt von (optional)', 'Issued by (optional)')}</span>
          <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1">
          <span className={label}>{L('Nummer / Aktenzeichen (optional)', 'Number / reference (optional)')}</span>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1">
          <span className={label}>{L('Ausstellungsdatum', 'Issue date')}</span>
          <input type="date" className={field} value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className={label}>{L('Gültig bis (Ablaufdatum)', 'Valid until (expiry)')}{renewOf ? ' *' : ''}</span>
          <input type="date" className={field} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
      </div>

      <div className="space-y-1">
        <span className={label}>{L('Erinnerungen an Admin & Disposition', 'Reminders to admin & dispatch')}</span>
        <div className="flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((d) => {
            const on = reminders.includes(d)
            return (
              <button
                type="button"
                key={d}
                onClick={() => setReminders((r) => (on ? r.filter((x) => x !== d) : [...r, d]))}
                className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold', on ? 'border-[#0064E0] bg-blue-50 text-[#0064E0]' : 'border-slate-200 text-slate-500')}
              >
                {reminderLabel(d, locale)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <span className={label}>{L('Datei (PDF oder Foto, max. 20 MB)', 'File (PDF or photo, max 20 MB)')}</span>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <FileUp className="w-5 h-5 text-blue-600" />
          <span className="truncate">{file ? file.name : initial?.file_name ? `${initial.file_name} (${L('ersetzen', 'replace')})` : L('Datei auswählen …', 'Choose file …')}</span>
          <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={L('Bemerkung (optional)', 'Remark (optional)')} className="rounded-xl" />

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700">
          {L('Pflicht für Einsätze', 'Required for shifts')}
          <Switch checked={required} onCheckedChange={setRequired} />
        </label>
        <label className={cn('flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700', !isAdmin && 'opacity-50')}>
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> {L('Vertraulich (nur Admin)', 'Confidential (admin only)')}</span>
          <Switch checked={confidential} onCheckedChange={setConfidential} disabled={!isAdmin} />
        </label>
      </div>

      {errors.length > 0 && (
        <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
          <AlertTriangle className="w-4 h-4" /> {errors[0]}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 h-11 rounded-xl font-bold">
          {L('Abbrechen', 'Cancel')}
        </Button>
        <Button type="submit" disabled={saving || errors.length > 0} className="flex-1 h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-bold">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {renewOf ? L('Erneuerung speichern', 'Save renewal') : initial ? L('Änderung speichern', 'Save changes') : L('Nachweis speichern', 'Save document')}
        </Button>
      </div>
    </form>
  )
}
