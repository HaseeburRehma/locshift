'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ArrowUpCircle, ArrowDownCircle, RotateCcw, ShoppingCart, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type TransactionType = 'top_up' | 'lead_purchase' | 'commission_debit' | 'refund'

interface Transaction {
  id: string
  amount: number
  transaction_type: string
  description: string | null
  created_at: string
  partners: { company_name: string } | { company_name: string }[] | null
}

function getPartnerName(partners: any): string {
  if (!partners) return 'Unknown'
  if (Array.isArray(partners)) return partners[0]?.company_name ?? 'Unknown'
  return partners.company_name ?? 'Unknown'
}

function getIcon(type: string) {
  switch (type) {
    case 'top_up':
      return <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
    case 'lead_purchase':
      return <ShoppingCart className="w-5 h-5 text-blue-500" />
    case 'commission_debit':
      return <ArrowDownCircle className="w-5 h-5 text-orange-500" />
    case 'refund':
      return <RotateCcw className="w-5 h-5 text-purple-500" />
    default:
      return <Clock className="w-5 h-5 text-gray-400" />
  }
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    top_up: 'Top Up',
    lead_purchase: 'Lead Purchase',
    commission_debit: 'Commission',
    refund: 'Refund',
  }
  return map[type] ?? type.replace(/_/g, ' ')
}

export function RecentTransactionsList({ transactions }: { transactions: Transaction[] }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-lg mb-4">Recent Transactions</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
      <h3 className="font-semibold text-lg mb-4">Recent Transactions</h3>
      <div className="space-y-0">
        {transactions.map((tx, i) => {
          const isPositive = tx.amount > 0
          const name = getPartnerName(tx.partners)
          const timeAgo = tx.created_at
            ? formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })
            : ''
          return (
            <div
              key={tx.id ?? i}
              className={cn(
                'flex items-center gap-4 py-3',
                i < transactions.length - 1 &&
                  'border-b border-gray-50 dark:border-gray-800'
              )}
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {getIcon(tx.transaction_type)}
              </div>

              {/* Center */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.description ?? getTypeLabel(tx.transaction_type)}
                </p>
              </div>

              {/* Right */}
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    'text-sm font-bold',
                    isPositive ? 'text-emerald-600' : 'text-red-500'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(tx.amount)}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
