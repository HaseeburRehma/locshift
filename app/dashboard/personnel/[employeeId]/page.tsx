'use client'

/** Personalakte eines Mitarbeiters (Kundenfeedback Punkt 11). */

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Mail, Phone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'
import { usePersonnelDocuments } from '@/hooks/personnel/usePersonnelDocuments'
import { DocumentForm } from '@/components/personnel/DocumentForm'
import { DocumentTable } from '@/components/personnel/DocumentTable'
import type { PersonnelDocument } from '@/lib/personnel/documents'

interface EmployeeInfo {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
}

export default function PersonnelFilePage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const router = useRouter()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState<{ mode: 'new' | 'edit' | 'renew'; doc?: PersonnelDocument } | null>(null)
  const { documents, loading, createDocument, updateDocument, deleteDocument, openFile } = usePersonnelDocuments({
    employeeId,
    includeArchived: showArchived,
  })

  useEffect(() => {
    if (!employeeId) return
    createClient()
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .eq('id', employeeId)
      .maybeSingle()
      .then(({ data }: { data: EmployeeInfo | null }) => setEmployee(data))
  }, [employeeId])

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="rounded-full mt-1" onClick={() => router.push('/dashboard/personnel')}>
          <ArrowLeft className="w-5 h-5 text-blue-600" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">
            {L('Personalakte', 'Personnel file')}{employee?.full_name ? ` · ${employee.full_name}` : ''}
          </h1>
          <p className="flex flex-wrap gap-3 text-sm text-slate-500 font-medium">
            {employee?.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {employee.email}</span>}
            {employee?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {employee.phone}</span>}
          </p>
        </div>
        <Button onClick={() => setForm({ mode: 'new' })} className="rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-bold">
          <Plus className="w-4 h-4 mr-1" /> {L('Nachweis', 'Document')}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        {L('Ersetzte (archivierte) Nachweise anzeigen', 'Show replaced (archived) documents')}
      </label>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <DocumentTable
          documents={documents}
          onOpenFile={openFile}
          onEdit={(d) => setForm({ mode: 'edit', doc: d })}
          onRenew={(d) => setForm({ mode: 'renew', doc: d })}
          onDelete={deleteDocument}
        />
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {form?.mode === 'renew' ? L('Nachweis erneuern', 'Renew document') : form?.mode === 'edit' ? L('Nachweis bearbeiten', 'Edit document') : L('Nachweis hinzufügen', 'Add document')}
            </DialogTitle>
          </DialogHeader>
          {form && employee && (
            <DocumentForm
              key={`${form.mode}-${form.doc?.id ?? 'new'}`}
              employees={[employee]}
              defaultEmployeeId={employee.id}
              initial={form.mode === 'edit' ? form.doc : null}
              renewOf={form.mode === 'renew' ? form.doc : null}
              onSubmit={(input, file) =>
                form.mode === 'edit' && form.doc
                  ? updateDocument(form.doc.id, input, file)
                  : createDocument(input, file, form.mode === 'renew' ? form.doc : null)
              }
              onCancel={() => setForm(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
