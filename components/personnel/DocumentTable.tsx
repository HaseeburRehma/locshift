'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Edit2, FileText, Lock, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { DOC_STATUS_STYLE, daysUntil, docStatus, docStatusLabel, docTypeLabel, type PersonnelDocument } from '@/lib/personnel/documents'
import { formatDateDE } from '@/lib/time/format'

interface Props {
  documents: PersonnelDocument[]
  showEmployee?: boolean
  onOpenFile: (d: PersonnelDocument) => void
  onEdit?: (d: PersonnelDocument) => void
  onRenew?: (d: PersonnelDocument) => void
  onDelete?: (d: PersonnelDocument) => void
}

export function DocumentTable({ documents, showEmployee, onOpenFile, onEdit, onRenew, onDelete }: Props) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [confirm, setConfirm] = useState<string | null>(null)

  if (documents.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-400">
        {L('Keine Nachweise vorhanden.', 'No documents yet.')}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              {showEmployee && <th className="px-4 py-3 text-left font-black">{L('Mitarbeiter', 'Employee')}</th>}
              <th className="px-4 py-3 text-left font-black">{L('Nachweis', 'Document')}</th>
              <th className="px-4 py-3 text-left font-black">{L('Ausgestellt', 'Issued')}</th>
              <th className="px-4 py-3 text-left font-black">{L('Gültig bis', 'Valid until')}</th>
              <th className="px-4 py-3 text-left font-black">Status</th>
              <th className="px-4 py-3 text-left font-black">{L('Bemerkung', 'Remark')}</th>
              <th className="px-4 py-3 text-right font-black">{L('Aktionen', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => {
              const status = docStatus(d)
              const left = d.expires_at ? daysUntil(d.expires_at) : null
              return (
                <tr key={d.id} className={cn('border-t border-slate-100', d.archived_at && 'opacity-50')}>
                  {showEmployee && (
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <Link href={`/dashboard/personnel/${d.user_id}`} className="hover:underline">{d.employee?.full_name ?? '—'}</Link>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      {d.is_confidential && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      {d.name}
                      {d.is_required && <span className="rounded bg-blue-50 px-1 text-[9px] font-black uppercase text-blue-700">{L('Pflicht', 'Required')}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{docTypeLabel(d.doc_type, locale)}{d.reference ? ` · ${d.reference}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{d.issued_at ? formatDateDE(d.issued_at) : '—'}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <p className="font-bold text-slate-900">{d.expires_at ? formatDateDE(d.expires_at) : L('unbefristet', 'no expiry')}</p>
                    {left != null && !d.archived_at && (
                      <p className={cn('text-xs font-semibold', left < 0 ? 'text-red-600' : left <= 28 ? 'text-amber-700' : 'text-slate-400')}>
                        {left < 0 ? L(`seit ${-left} Tagen abgelaufen`, `expired ${-left} days ago`) : left === 0 ? L('läuft heute ab', 'expires today') : L(`noch ${left} Tage`, `${left} days left`)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', d.archived_at ? 'bg-slate-50 text-slate-500 border-slate-200' : DOC_STATUS_STYLE[status])}>
                      {d.archived_at ? L('Ersetzt', 'Replaced') : docStatusLabel(status, locale)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px] truncate" title={d.remark ?? ''}>{d.remark || '—'}</td>
                  <td className="px-4 py-3">
                    {confirm === d.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold text-slate-500">{L('Löschen?', 'Delete?')}</span>
                        <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white" onClick={() => { setConfirm(null); onDelete?.(d) }}>{L('Ja', 'Yes')}</button>
                        <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600" onClick={() => setConfirm(null)}>{L('Nein', 'No')}</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {(d.file_path || d.document_url) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-blue-600" onClick={() => onOpenFile(d)} aria-label={L('Datei öffnen', 'Open file')}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        {onRenew && !d.archived_at && d.expires_at && (
                          <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold text-emerald-700" onClick={() => onRenew(d)}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> {L('Erneuern', 'Renew')}
                          </Button>
                        )}
                        {onEdit && !d.archived_at && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500" onClick={() => onEdit(d)} aria-label={L('Bearbeiten', 'Edit')}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500" onClick={() => setConfirm(d.id)} aria-label={L('Löschen', 'Delete')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
