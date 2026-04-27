'use client'

import React, { useState, useMemo } from 'react'
import { Eye, Plus, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, MapPin, ChevronDown, Users, CalendarClock, Play, UserCheck, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TimeEntry, UserRole, Profile } from '@/lib/types'
import { format, isThisWeek, isThisMonth, parseISO } from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface TimesListProps {
  entries: TimeEntry[]
  userRole?: UserRole
  onEntryClick: (id: string) => void
  onAddClick: () => void
  onToggleStatus?: (id: string, currentStatus: boolean) => void
  /** Phase 2 #3 — flip an entry from planned → actual. */
  onConvertPlanned?: (id: string) => void
  employees?: Profile[]
  /**
   * Phase 5 #4/#5/#6 — fires when the user taps "Export PDF".
   * Receives the CURRENTLY filtered entries + the employee name for the
   * active employee filter ("all" → null). The page is responsible for the
   * actual PDF generation via lib/pdf/exportPdf.
   */
  onExportPdf?: (args: {
    entries: TimeEntry[]
    employeeName: string | null
  }) => void
  /**
   * Hard-delete a time entry. Only wired by the parent page when the
   * current user is admin / dispatcher; the trash button is hidden for
   * everyone else by checking whether this prop is defined.
   */
  onDelete?: (entry: TimeEntry) => void
}

type FilterStatus = 'All' | 'Planned' | 'Actual' | 'Pending' | 'Approved' | 'Rejected' | 'This Week' | 'This Month'

export function TimesList({ entries, userRole, onEntryClick, onAddClick, onToggleStatus, onConvertPlanned, employees, onExportPdf, onDelete }: TimesListProps) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const dateLocale = locale === 'de' ? deLocale : undefined
  const canAdd = userRole === 'admin' || userRole === 'dispatcher'
  const isAdminView = userRole === 'admin' || userRole === 'dispatcher'
  const [filter, setFilter] = useState<FilterStatus>('All')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Filter pill labels (German-first per Rheinmaasrail brief)
  const filterLabels: Record<FilterStatus, string> = {
    All:            L('Alle', 'All'),
    Planned:        L('Geplant', 'Planned'),
    Actual:         L('Tatsächlich', 'Actual'),
    Pending:        L('Ausstehend', 'Pending'),
    Approved:       L('Genehmigt', 'Approved'),
    Rejected:       L('Abgelehnt', 'Rejected'),
    'This Week':    L('Diese Woche', 'This Week'),
    'This Month':   L('Dieser Monat', 'This Month'),
  }

  // Build employee options from the entries + passed employees list
  const employeeOptions = useMemo(() => {
    const empMap = new Map<string, string>()
    // Use provided profiles first
    if (employees) {
      employees.forEach(p => {
        if (p.full_name) empMap.set(p.id, p.full_name)
      })
    }
    // Also include any employee from entries
    entries.forEach(e => {
      if (e.employee_id && e.employee?.full_name && !empMap.has(e.employee_id)) {
        empMap.set(e.employee_id, e.employee.full_name)
      }
    })
    return Array.from(empMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entries, employees])

  // Filter logic
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Phase 2 #3 — planned/actual filters
    if (filter === 'Planned') {
      result = result.filter(e => e.is_planned === true)
    } else if (filter === 'Actual') {
      result = result.filter(e => !e.is_planned)
    } else if (filter === 'Pending') {
      result = result.filter(e => !e.is_verified && !e.is_planned)
    } else if (filter === 'Approved') {
      result = result.filter(e => e.is_verified && !e.is_planned)
    } else if (filter === 'Rejected') {
      result = result.filter(() => false)
    } else if (filter === 'This Week') {
      result = result.filter(e => {
        try {
          return isThisWeek(parseISO(e.date))
        } catch { return false }
      })
    } else if (filter === 'This Month') {
      result = result.filter(e => {
        try {
          return isThisMonth(parseISO(e.date))
        } catch { return false }
      })
    }

    // Employee filter (admin/dispatcher only)
    if (isAdminView && employeeFilter !== 'all') {
      result = result.filter(e => e.employee_id === employeeFilter)
    }

    return result;
  }, [entries, filter, employeeFilter, isAdminView])

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Reset page on filter change
  const handleFilterChange = (f: FilterStatus) => {
    setFilter(f)
    setCurrentPage(1)
  }
  const handleEmployeeChange = (id: string) => {
    setEmployeeFilter(id)
    setCurrentPage(1)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/40 md:bg-transparent animate-in fade-in duration-300">
      {/* Title */}
      <div className="mb-6 px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0] leading-none mb-2">
          {L('Zeiterfassung', 'Time Tracking')}
        </h1>
        <p className="text-sm font-medium text-slate-400">
          {L('Arbeitszeiten erfassen und verwalten', 'Record and manage working hours')}
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
        {/* Header Toolbar */}
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {L('Filter & Suche', 'Filter & Search')}
            </h2>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Phase 5 #4/#5/#6 — PDF export button, always visible.
               For employees, the parent page pre-filters entries by user.id,
               so this button naturally becomes their "own data" export (#5).
               For admins, it respects the current employee dropdown (#6). */}
            {onExportPdf && (
              <Button
                onClick={() => {
                  const activeName =
                    isAdminView && employeeFilter !== 'all'
                      ? employeeOptions.find(e => e.id === employeeFilter)?.name ?? null
                      : null
                  onExportPdf({ entries: filteredEntries, employeeName: activeName })
                }}
                variant="outline"
                disabled={filteredEntries.length === 0}
                className="font-bold rounded-xl shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 min-w-[140px] px-6 disabled:opacity-50"
                title={
                  filteredEntries.length === 0
                    ? L('Keine Einträge zum Exportieren', 'No entries to export')
                    : L('PDF exportieren', 'Export PDF')
                }
              >
                <Download className="w-4 h-4 mr-2" />
                {L('PDF exportieren', 'Export PDF')}
              </Button>
            )}
            {canAdd && (
              <Button
                onClick={onAddClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md min-w-[140px] px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                {L('Eintrag hinzufügen', 'Add Time Entry')}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills + Employee Dropdown */}
        <div className="px-6 py-2 flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Planned', 'Actual', 'Pending', 'Approved', 'This Week', 'This Month'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold transition-all border",
                  filter === f
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>

          {/* Employee filter — admin/dispatcher only */}
          {isAdminView && employeeOptions.length > 0 && (
            <div className="relative w-full sm:w-52 flex-shrink-0">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={employeeFilter}
                onChange={e => handleEmployeeChange(e.target.value)}
                className={cn(
                  "w-full h-10 pl-9 pr-9 rounded-xl border bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-xs appearance-none cursor-pointer",
                  employeeFilter !== 'all'
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                )}
              >
                <option value="all">{L('Alle Mitarbeiter', 'All Employees')}</option>
                {employeeOptions.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-800 text-[11px] uppercase tracking-wider border-y border-slate-100">
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Datum', 'Date')}</th>
                {isAdminView && <th className="px-6 py-4 font-black whitespace-nowrap">{L('Mitarbeiter', 'Employee')}</th>}
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Startzeit', 'Start Time')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Endzeit', 'End Time')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Pause', 'Break')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Gesamtstunden', 'Total Hours')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Kunde', 'Customer')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Standort', 'Location')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">{L('Status', 'Status')}</th>
                <th className="px-6 py-4 font-black whitespace-nowrap text-right">{L('Aktionen', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                      {format(parseISO(entry.date), locale === 'de' ? 'dd.MM.yyyy' : 'MMM dd, yyyy', { locale: dateLocale })}
                    </td>
                    {isAdminView && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={entry.employee?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.employee?.full_name || 'U')}&background=0064E0&color=fff&size=32`}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-slate-100"
                          />
                          <span className="text-sm font-bold text-slate-800 truncate max-w-[120px]">
                            {entry.employee?.full_name || L('Unbekannt', 'Unknown')}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      {format(new Date(entry.start_time), 'HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : L('Aktiv', 'Active')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      {entry.break_minutes} min
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-bold whitespace-nowrap">
                      {entry.net_hours ? entry.net_hours.toFixed(2) : '0.0'}h
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      {entry.customer?.name || entry.plan?.customer?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      <div className="flex flex-col">
                        {/* Phase 3 #1 — prefer Betriebsstelle names if set, fall back to free-text location */}
                        {(entry.start_location?.name || entry.destination_location?.name) ? (
                          <span className="text-slate-800 font-semibold">
                            {entry.start_location?.name ?? '—'}
                            <span className="mx-1 text-slate-300">→</span>
                            {entry.destination_location?.name ?? '—'}
                          </span>
                        ) : (
                          <span>{entry.location || entry.plan?.location || '-'}</span>
                        )}
                        {entry.latitude && entry.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1 font-bold"
                            onClick={e => e.stopPropagation()}
                          >
                            <MapPin className="w-3 h-3" /> {L('Einsatzkoordinaten', 'Mission Coordinates')}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {entry.is_planned ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100/70 text-sky-700">
                            <CalendarClock className="w-3 h-3" />
                            {L('Geplant', 'Planned')}
                          </span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            entry.is_verified ? "bg-emerald-100/50 text-emerald-600" : "bg-orange-100/50 text-orange-600"
                          )}>
                            {entry.is_verified ? L('Genehmigt', 'Approved') : L('Ausstehend', 'Pending')}
                          </span>
                        )}
                        {/* Phase 3 #10 — Gastfahrt badge (informational) */}
                        {entry.is_gastfahrt && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-100/70 text-violet-700"
                            title="Gastfahrt (Beifahrer)"
                          >
                            <UserCheck className="w-3 h-3" />
                            Gast
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Phase 2 #3 — convert planned → actual */}
                        {entry.is_planned && onConvertPlanned && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100"
                            title={L('Als tatsächlich markieren', 'Mark as actual')}
                            onClick={(e) => {
                              e.stopPropagation()
                              onConvertPlanned(entry.id)
                            }}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {!entry.is_planned && onToggleStatus && canAdd && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-lg",
                              entry.is_verified
                                ? "bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                                : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600"
                            )}
                            title={entry.is_verified ? L('Auf ausstehend setzen', 'Mark as Pending') : L('Eintrag genehmigen', 'Approve Log')}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(entry.id, entry.is_verified);
                            }}
                          >
                            {entry.is_verified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
                          onClick={() => onEntryClick(entry.id)}
                          title={L('Anzeigen', 'View')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {/* Phase 6 #4 — admin/dispatcher delete (the parent
                            only passes onDelete for those roles, so it is
                            naturally hidden for employees). */}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(entry)
                            }}
                            title={L('Löschen', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdminView ? 10 : 9} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    {L('Keine Zeiteinträge gefunden', 'No time entries found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'de' ? (
                <>
                  Zeige <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + (paginatedEntries.length > 0 ? 1 : 0)}</span> bis <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredEntries.length)}</span> von <span className="text-slate-900">{filteredEntries.length}</span> Einträgen
                </>
              ) : (
                <>
                  Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + (paginatedEntries.length > 0 ? 1 : 0)}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredEntries.length)}</span> of <span className="text-slate-900">{filteredEntries.length}</span> results
                </>
              )}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-slate-200"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                      currentPage === i + 1
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 bg-transparent"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-slate-200"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
