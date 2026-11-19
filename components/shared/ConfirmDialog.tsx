'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmOptions {
  title: string
  /** Short explanation under the title. */
  description?: string
  /** Facts about the affected record, shown as a list (date, employee, hours). */
  details?: string[]
  /** Highlighted hint, e.g. "Wird im Änderungsprotokoll festgehalten". */
  note?: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

const ConfirmContext = React.createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

/**
 * App-styled replacement for window.confirm() (QA P2-2). Same look as
 * "Schicht umverteilen". Usage: `if (!(await confirm({...}))) return`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null)

  const confirm = React.useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => !open && close(false)}>
        {pending && (
          <DialogContent className="sm:max-w-md rounded-[2rem] p-6 md:p-8">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-xl font-black tracking-tight">{pending.title}</DialogTitle>
              {pending.description && <DialogDescription>{pending.description}</DialogDescription>}
            </DialogHeader>
            {pending.details && pending.details.length > 0 && (
              <ul className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                {pending.details.map((d) => (
                  <li key={d} className="text-sm font-bold text-slate-800 break-words">{d}</li>
                ))}
              </ul>
            )}
            {pending.note && (
              <div className="mt-2 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pending.note}</span>
              </div>
            )}
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" className="rounded-xl font-bold" onClick={() => close(false)}>
                {pending.cancelLabel}
              </Button>
              <Button
                autoFocus
                onClick={() => close(true)}
                className={
                  pending.destructive
                    ? 'h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black uppercase text-[11px] tracking-widest'
                    : 'h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-black uppercase text-[11px] tracking-widest'
                }
              >
                {pending.confirmLabel}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = React.useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
