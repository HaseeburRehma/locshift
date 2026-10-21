'use client'

/**
 * Route-level error boundary for the dashboard: a render error in one page
 * shows this panel inside the normal layout (sidebar stays usable) instead
 * of Next's blank "Application error" screen.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[dashboard error boundary]', error)
  }, [error])

  // Missing column/table → the database update has not been applied yet.
  const schemaPending = /does not exist|schema cache|PGRST20[45]|42703|42P01/i.test(error?.message ?? '')

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
        <AlertTriangle className="h-7 w-7 text-amber-600" />
      </div>
      <h2 className="text-xl font-black tracking-tight text-slate-900">
        {schemaPending ? 'Server-Update ausstehend' : 'Diese Seite konnte nicht geladen werden'}
      </h2>
      <p className="text-sm text-slate-500">
        {schemaPending
          ? 'Die Datenbank wird gerade aktualisiert. Bitte versuchen Sie es in einigen Minuten erneut.'
          : 'Ein unerwarteter Fehler ist aufgetreten. Ihre Daten sind gespeichert. Bitte versuchen Sie es erneut oder wechseln Sie zur Übersicht.'}
      </p>
      {error?.digest && <p className="font-mono text-[11px] text-slate-400">Fehler-ID: {error.digest}</p>}
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-xl bg-[#0064E0] font-bold hover:bg-[#0050B4]">
          <RotateCcw className="mr-2 h-4 w-4" /> Erneut versuchen
        </Button>
        <Button asChild variant="outline" className="rounded-xl font-bold">
          <Link href="/dashboard">Zur Übersicht</Link>
        </Button>
      </div>
    </div>
  )
}
