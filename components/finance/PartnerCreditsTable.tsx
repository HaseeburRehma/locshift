'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Plus } from 'lucide-react'
import Link from 'next/link'

interface Partner {
  id: string
  name: string
  balance: number
  activeLeads: number
  commissionsOwed: number
  lastTopUp: string | null
}

function formatEUR(v: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v)
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance > 100) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        {formatEUR(balance)}
      </span>
    )
  }
  if (balance > 0) {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        {formatEUR(balance)}
      </span>
    )
  }
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
      {formatEUR(balance)}
    </span>
  )
}

export function PartnerCreditsTable({ partners }: { partners: Partner[] }) {
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = [...partners].sort((a, b) =>
    sortAsc ? a.balance - b.balance : b.balance - a.balance
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-lg">Partner Credit Balances</h3>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort by balance
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No partner data found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Partner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comm. Owed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Top-Up</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((partner, i) => (
                <tr
                  key={partner.id}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    i < sorted.length - 1 && 'border-b border-gray-50 dark:border-gray-800'
                  )}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-sm">{partner.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <BalanceBadge balance={partner.balance} />
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      'text-sm font-medium',
                      partner.commissionsOwed > 0 ? 'text-orange-600' : 'text-muted-foreground'
                    )}>
                      {formatEUR(partner.commissionsOwed)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {partner.lastTopUp
                      ? new Date(partner.lastTopUp).toLocaleDateString('de-DE')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs h-8">
                      <Link href="/dashboard/finance/add-credits">
                        <Plus className="w-3 h-3" /> Add Credits
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
