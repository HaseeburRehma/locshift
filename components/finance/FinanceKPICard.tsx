'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

type ColorKey = 'blue' | 'emerald' | 'violet' | 'amber'

const COLOR_MAP: Record<ColorKey, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600' },
}

interface FinanceKPICardProps {
  label: string
  value: string
  change: string
  positive: boolean
  icon: React.ReactNode
  sub: string
  color: ColorKey
}

export function FinanceKPICard({
  label,
  value,
  change,
  positive,
  icon,
  sub,
  color,
}: FinanceKPICardProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
            c.bg
          )}
        >
          <span className={c.text}>{icon}</span>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1',
            positive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          )}
        >
          {positive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {change}
        </span>
      </div>
      <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}
