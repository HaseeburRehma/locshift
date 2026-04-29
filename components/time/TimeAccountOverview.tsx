'use client'

import React, { useState } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { MonthlyTimeData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { de as deLocale } from 'date-fns/locale'

interface TimeAccountOverviewProps {
  onBack: () => void
  onMonthClick: (month: string) => void
  data: MonthlyTimeData[]
  totalBalance: number
  totalOvertimePaid: number
  employeeName?: string
}

const ITEMS_PER_PAGE = 6

export function TimeAccountOverview({
  onBack,
  onMonthClick,
  data,
  totalBalance,
  totalOvertimePaid,
  employeeName,
}: TimeAccountOverviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const dateLocaleTag = locale === 'de' ? 'de-DE' : 'en-US'
  // German abbreviation for "hour" is "Std." (Stunde) — apply to every hour-suffix on this page.
  const hr = L('Std.', 'h')

  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE))
  const paginatedData = data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Stats derived from most-recent month
  const latestMonth = data[0] ?? null
  const totalHours = latestMonth?.actualHours ?? 0
  const latestMonthLabel = latestMonth
    ? new Date(latestMonth.year, latestMonth.month - 1).toLocaleDateString(dateLocaleTag, { month: 'short' })
    : 'N/A'
  const workingDays = latestMonth?.workingDays ?? 0

  return (
    <div className="flex flex-col min-h-full bg-white animate-in fade-in duration-300">

      {/* ── Mobile-only back nav bar ── */}
      <div className="md:hidden relative flex items-center justify-center px-4 py-4 border-b border-slate-100 bg-white sticky top-0 z-50">
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-4 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-90 transition-all text-blue-600 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">
          {employeeName ?? L('Zeitkonten', 'Time Accounts')}
        </h1>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 px-5 md:px-8 pt-6 pb-16 space-y-7 max-w-5xl w-full mx-auto">

        {/* Desktop back button (admin drilling into employee) */}
        {employeeName && (
          <button
            onClick={onBack}
            className="hidden md:flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {L('Zurück zur Personalliste', 'Back to Personnel')}
          </button>
        )}

        {/* ── Page Title ── */}
        <div className="space-y-1">
          <h1 className="text-[26px] md:text-[30px] font-bold text-[#0064E0] tracking-tight leading-none">
            {employeeName
              ? L(`Zeitkonto von ${employeeName}`, `${employeeName}'s Account`)
              : L('Zeitkonten', 'Time Accounts')}
          </h1>
          <p className="text-[13px] text-slate-500 font-normal">
            {L('Überstunden und Konto-Salden verfolgen', 'Track overtime and account balances')}
          </p>
        </div>

        {/* ── 4 Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Hours Balance */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className={cn(
              'text-[28px] md:text-[32px] font-bold tabular-nums leading-none tracking-tight',
              totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'
            )}>
              {totalBalance > 0
                ? `+${totalBalance.toFixed(1)}${hr}`
                : `${totalBalance.toFixed(1)}${hr}`}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">
              {L('Stundensaldo (lfd. Jahr)', 'Hours Balance (YTD)')}
            </p>
          </div>

          {/* Overtime Paid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-blue-600 leading-none tracking-tight">
              {totalOvertimePaid.toFixed(1)}{hr}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">
              {L('Bezahlte Überstunden', 'Overtime Paid')}
            </p>
          </div>

          {/* Total Hours */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-blue-600 leading-none tracking-tight">
              {totalHours.toFixed(1)}{hr}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">
              {L(`Gesamtstunden (${latestMonthLabel})`, `Total Hours (${latestMonthLabel})`)}
            </p>
          </div>

          {/* Working Days */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-blue-600 leading-none tracking-tight">
              {workingDays}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">
              {L('Arbeitstage', 'Working Days')}
            </p>
          </div>
        </div>

        {/* ── Monthly Breakdown ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          {/* Section header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">
              {L('Monatsübersicht', 'Monthly Breakdown')}
            </h2>
            {data.length > ITEMS_PER_PAGE && (
              <span className="text-[12px] text-slate-400 font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, data.length)} {L('von', 'of')} {data.length}
              </span>
            )}
          </div>

          {/* Empty state */}
          {data.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-[13px] text-slate-400 font-medium">
                {L('Keine Zeiteinträge gefunden.', 'No time records found.')}
              </p>
            </div>
          )}

          {/* Month rows */}
          <div className="divide-y divide-slate-100">
            {paginatedData.map((month) => {
              const label = new Date(month.year, month.month - 1).toLocaleDateString(dateLocaleTag, {
                month: 'long',
                year: 'numeric',
              })

              return (
                <button
                  key={month.key}
                  onClick={() => onMonthClick(month.key)}
                  className="w-full text-left group flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-[15px] font-semibold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                      {label}
                    </h4>
                    <p className="text-[12px] text-slate-400 font-normal">
                      {month.workingDays} {L('Arbeitstage', 'working days')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[15px] font-semibold tabular-nums',
                      month.difference >= 0 ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {month.difference >= 0
                        ? `+${month.difference.toFixed(1)}${hr}`
                        : `${month.difference.toFixed(1)}${hr}`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </button>
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
                        : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-200 border border-transparent'
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
