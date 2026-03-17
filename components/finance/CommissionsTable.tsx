'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Commission {
  id: string
  partnerName: string
  customerName: string
  amount: number
  status: string
  paid: boolean
  date: string
}

function formatEUR(v: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v)
}

export function CommissionsTable({ commissions: initial }: { commissions: Commission[] }) {
  const [commissions, setCommissions] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const unpaid = commissions.filter((c) => !c.paid)
  const allSelected = unpaid.length > 0 && unpaid.every((c) => selected.has(c.id))

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(unpaid.map((c) => c.id)))
    }
  }

  const markPaid = async (ids: string[]) => {
    // Optimistic update
    setCommissions((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, paid: true } : c))
    )
    setSelected(new Set())

    try {
      const res = await fetch('/api/finance/mark-commission-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`${ids.length} commission${ids.length > 1 ? 's' : ''} marked as paid`)
    } catch {
      // Revert
      setCommissions((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, paid: false } : c))
      )
      toast.error('Failed to mark commission as paid')
    }
  }

  if (commissions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-lg mb-2">Partner Commissions</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No converted commissions yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-lg">Partner Commissions</h3>
        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={() => startTransition(() => markPaid([...selected]))}
            disabled={isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs h-8"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Mark {selected.size} Paid
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-6 py-3 w-10">
                <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                  {allSelected ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Partner</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c, i) => (
              <tr
                key={c.id}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                  i < commissions.length - 1 && 'border-b border-gray-50 dark:border-gray-800'
                )}
              >
                <td className="px-6 py-4">
                  {!c.paid && (
                    <button onClick={() => toggleSelect(c.id)}>
                      {selected.has(c.id) ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </td>
                <td className="px-4 py-4 font-medium">{c.partnerName}</td>
                <td className="px-4 py-4 text-muted-foreground">{c.customerName}</td>
                <td className="px-4 py-4 font-semibold">{formatEUR(c.amount)}</td>
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold',
                      c.paid
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10'
                    )}
                  >
                    {c.paid ? '✓ Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-4 text-muted-foreground text-xs">
                  {c.date ? new Date(c.date).toLocaleDateString('de-DE') : '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  {!c.paid && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markPaid([c.id])}
                      className="rounded-lg text-xs h-7 gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Mark Paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
