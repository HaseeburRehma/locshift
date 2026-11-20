'use client'

/**
 * Only rendered for internal (support/test) accounts: test accounts are
 * hidden everywhere by default, also for us. Switch them on in this browser
 * for an acceptance run, off again before showing the app to the client.
 */
import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { readShowTestAccounts, writeShowTestAccounts } from '@/lib/profiles/internal'

export function TestAccountsToggle() {
  const [on, setOn] = useState(false)
  useEffect(() => setOn(readShowTestAccounts()), [])

  const change = (next: boolean) => {
    writeShowTestAccounts(next)
    setOn(next)
    // Lists load once per page; a reload applies the choice everywhere.
    window.location.reload()
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3 min-w-0">
        <FlaskConical className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900">Interne Testkonten anzeigen</p>
          <p className="text-xs text-amber-800">
            Nur für den Support sichtbar. Standardmäßig sind Testkonten überall ausgeblendet – auch für Sie.
            Gilt nur in diesem Browser.
          </p>
        </div>
      </div>
      <Switch checked={on} onCheckedChange={change} aria-label="Interne Testkonten anzeigen" />
    </div>
  )
}
