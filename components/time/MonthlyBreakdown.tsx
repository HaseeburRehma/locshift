'use client'

import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { MonthlyTimeData } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
  isSameDay,
  isWeekend,
} from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface MonthlyBreakdownProps {
  onBack: () => void
  monthData: MonthlyTimeData
}

const ITEMS_PER_PAGE = 10

export function MonthlyBreakdown({ onBack, monthData }: MonthlyBreakdownProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const dateLocale = locale === 'de' ? deLocale : undefined

  const monthStart = startOfMonth(new Date(monthData.year, monthData.month - 1))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const monthLabel = format(monthStart, 'MMMM yyyy', { locale: dateLocale })

  // Paid overtime = sum of hours > 8 per worked day
  const paidOvertimeHours = days.reduce((sum, day) => {
    const entries = monthData.entries.filter(e => isSameDay(new Date(e.date), day))
    const actual = entries.reduce((s, e) => s + (e.net_hours || 0), 0)
    return sum + (actual > 8 ? actual - 8 : 0)
  }, 0)

  const totalPages = Math.max(1, Math.ceil(days.length / ITEMS_PER_PAGE))
  const paginatedDays = days.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="flex flex-col min-h-full bg-white animate-in fade-in duration-300">

      {/* ── Mobile-only nav bar ── */}
      <div className="md:hidden relative flex items-center justify-center px-4 py-4 border-b border-slate-100 bg-white sticky top-0 z-50">
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-4 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-90 transition-all text-blue-600 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">{monthLabel}</h1>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 px-5 md:px-8 pt-6 pb-16 space-y-7 max-w-5xl w-full mx-auto">

        {/* Desktop back link */}
        <button
          onClick={onBack}
          className="hidden md:flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Overview
        </button>

        {/* ── Page Title ── */}
        <div className="space-y-1">
          <h1 className="text-[26px] md:text-[30px] font-bold text-slate-900 tracking-tight leading-none">
            {monthLabel}
          </h1>
          <p className="text-[13px] text-slate-500">{L('Tägliche Einsatzdaten', 'Daily operational records')}</p>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={L('Geplante Stunden', 'Scheduled Hours')}
            value={`${monthData.scheduledHours.toFixed(1)} ${L('Std.', 'hrs')}`}
          />
          <StatCard
            label={L('Tatsächliche Stunden', 'Actual Hours')}
            value={`${monthData.actualHours.toFixed(1)} ${L('Std.', 'hrs')}`}
          />
          <StatCard
            label={L('Differenz', 'Difference')}
            value={
              monthData.difference >= 0
                ? `+${monthData.difference.toFixed(1)} ${L('Std.', 'hrs')}`
                : `${monthData.difference.toFixed(1)} ${L('Std.', 'hrs')}`
            }
            valueColor={monthData.difference >= 0 ? 'emerald' : 'red'}
          />
          <StatCard
            label={L('Bezahlte Überstunden', 'Paid Overtime')}
            value={`${paidOvertimeHours.toFixed(1)} ${L('Std.', 'hrs')}`}
          />
        </div>

        {/* ── Daily Breakdown Container ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">{L('Tägliche Übersicht', 'Daily Breakdown')}</h2>
            <span className="text-[12px] text-slate-400 font-medium">
              {L('Tage', 'Days')} {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, days.length)} {L('von', 'of')} {days.length}
            </span>
          </div>

          {/* Column headers — desktop only */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            <div className="col-span-4">{L('Datum', 'Date')}</div>
            <div className="col-span-3 text-right">{L('Geplant', 'Scheduled')}</div>
            <div className="col-span-3 text-right">{L('Tatsächlich', 'Actual')}</div>
            <div className="col-span-2 text-right">{L('Differenz', 'Difference')}</div>
          </div>

          {/* Day rows */}
          <div className="divide-y divide-slate-100">
            {paginatedDays.map((day) => {
              const entriesForDay = monthData.entries.filter(e =>
                isSameDay(new Date(e.date), day)
              )
              const totalActual = entriesForDay.reduce((s, e) => s + (e.net_hours || 0), 0)
              const scheduled = isWeekend(day) ? 0 : 8.0
              const diff = totalActual - scheduled
              const dayLabel = format(day, locale === 'de' ? 'EEE, dd. MMM' : 'EEE, MMM d', { locale: dateLocale })
              const isWeekendDay = isWeekend(day)

              const hrsUnit = L('Std.', 'hrs')
              let diffText = `0 ${hrsUnit}`
              let diffColor = 'text-slate-400'
              if (diff > 0) { diffText = `+${diff.toFixed(1)} ${hrsUnit}`; diffColor = 'text-emerald-500' }
              else if (diff < 0) { diffText = `${diff.toFixed(1)} ${hrsUnit}`; diffColor = 'text-red-500' }

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'group hover:bg-slate-50 transition-colors',
                    isWeekendDay ? 'bg-slate-50/40' : 'bg-white'
                  )}
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-12 items-center px-6 py-4">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className={cn(
                        'w-1 h-8 rounded-full',
                        diff > 0 ? 'bg-emerald-400' : diff < 0 ? 'bg-red-400' : 'bg-slate-200'
                      )} />
                      <div>
                        <p className={cn(
                          'text-[14px] font-semibold leading-none',
                          isWeekendDay ? 'text-slate-400' : 'text-slate-900'
                        )}>
                          {dayLabel}
                        </p>
                        {isWeekendDay && (
                          <p className="text-[11px] text-slate-300 mt-0.5">{L('Wochenende', 'Weekend')}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-[14px] font-medium text-slate-500 tabular-nums">
                        {scheduled.toFixed(1)} {hrsUnit}
                      </span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-[14px] font-semibold text-slate-900 tabular-nums">
                        {totalActual.toFixed(1)} {hrsUnit}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={cn('text-[14px] font-semibold tabular-nums', diffColor)}>
                        {diffText}
                      </span>
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="md:hidden px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'text-[15px] font-semibold',
                        isWeekendDay ? 'text-slate-400' : 'text-slate-900'
                      )}>
                        {dayLabel}
                      </span>
                      <span className={cn('text-[14px] font-semibold tabular-nums', diffColor)}>
                        {diffText}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-[12px]">
                      <div>
                        <p className="text-slate-400 font-medium">{L('Geplant', 'Scheduled')}</p>
                        <p className="text-slate-700 font-semibold tabular-nums">{scheduled.toFixed(1)} {hrsUnit}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">{L('Tatsächlich', 'Actual')}</p>
                        <p className="text-slate-900 font-bold tabular-nums">{totalActual.toFixed(1)} {hrsUnit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="text-[13px] font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 active:scale-95"
              >
                ← {L('Zurück', 'Previous')}
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-[12px] font-semibold transition-all active:scale-95',
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="text-[13px] font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 active:scale-95"
              >
                {L('Weiter', 'Next')} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  valueColor = 'default',
}: {
  label: string
  value: string
  valueColor?: 'emerald' | 'red' | 'default'
}) {
  const colorMap = {
    emerald: 'text-emerald-500',
    red: 'text-red-500',
    default: 'text-slate-900',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className={cn('text-[22px] md:text-[26px] font-bold tabular-nums leading-none tracking-tight', colorMap[valueColor])}>
        {value}
      </div>
      <p className="text-[12px] text-slate-500 font-normal leading-none">{label}</p>
    </div>
  )
}
