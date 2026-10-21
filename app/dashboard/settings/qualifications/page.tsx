'use client'

/**
 * Meine Nachweise — the employee's own (non-confidential) documents from
 * the Personalakte, read-only. Admin/dispatch manage them under
 * "Personal & Fristen".
 */

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { usePersonnelDocuments } from '@/hooks/personnel/usePersonnelDocuments'
import { DocumentTable } from '@/components/personnel/DocumentTable'

export default function MyDocumentsPage() {
  const router = useRouter()
  const { user, isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { documents, loading, openFile } = usePersonnelDocuments({ employeeId: user?.id })

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="rounded-full mt-1" onClick={() => router.push('/dashboard/settings')}>
          <ChevronLeft className="w-5 h-5 text-blue-600" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0064E0]">{L('Meine Nachweise', 'My documents')}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {L('Tauglichkeit, Führerschein und weitere Nachweise mit Gültigkeit', 'Fitness certificate, licence and other documents with validity')}
          </p>
        </div>
      </div>
      {(isAdmin || isDispatcher) && (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {L('Nachweise aller Mitarbeiter verwalten Sie unter ', 'Manage everyone’s documents under ')}
          <Link href="/dashboard/personnel" className="underline font-bold">{L('Personal & Fristen', 'Staff & deadlines')}</Link>.
        </p>
      )}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <DocumentTable documents={documents} onOpenFile={openFile} />
      )}
      <p className="text-xs text-slate-400">
        {L('Neue oder erneuerte Nachweise bitte bei der Disposition einreichen – sie werden dort in Ihrer Personalakte hinterlegt.', 'Please hand in new or renewed documents to dispatch – they are stored in your personnel file there.')}
      </p>
    </div>
  )
}
