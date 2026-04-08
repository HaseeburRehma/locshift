'use client'

import React, { useState, useMemo } from 'react'
import { Eye, Plus, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TimeEntry, UserRole } from '@/lib/types'
import { format, isThisWeek, isThisMonth, parseISO } from 'date-fns'

interface TimesListProps {
  entries: TimeEntry[]
  userRole?: UserRole
  onEntryClick: (id: string) => void
  onAddClick: () => void
  onToggleStatus?: (id: string, currentStatus: boolean) => void
}

type FilterStatus = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'This Week' | 'This Month'

export function TimesList({ entries, userRole, onEntryClick, onAddClick, onToggleStatus }: TimesListProps) {
  const canAdd = userRole === 'admin' || userRole === 'dispatcher'
  const [filter, setFilter] = useState<FilterStatus>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Filter logic
  const filteredEntries = useMemo(() => {
    let result = entries;

    if (filter === 'Pending') {
      result = result.filter(e => !e.is_verified)
    } else if (filter === 'Approved') {
      result = result.filter(e => e.is_verified)
    } else if (filter === 'Rejected') {
      // Assuming empty as there's no explicitly rejected state yet
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

    return result;
  }, [entries, filter])

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="flex flex-col h-full bg-slate-50/40 md:bg-transparent animate-in fade-in duration-300">
      {/* Title */}
      <div className="mb-6 px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none mb-2">Time Tracking</h1>
        <p className="text-sm font-medium text-slate-400">Record and manage working hours</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
        {/* Header Toolbar */}
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Filter & Search</h2>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {canAdd && (
              <Button 
                onClick={onAddClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md min-w-[140px] px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time Entry
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-2 flex flex-wrap items-center gap-2 mb-4">
          {(['All', 'Pending', 'Approved', 'Rejected', 'This Week', 'This Month'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setCurrentPage(1); }}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all border",
                filter === f 
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-800 text-[11px] uppercase tracking-wider border-y border-slate-100">
                <th className="px-6 py-4 font-black whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">Start Time</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">End Time</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">Break</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">Total Hours</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">Customer</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">Location</th>
                <th className="px-6 py-4 font-black whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-black whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">
                      {format(parseISO(entry.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      {format(new Date(entry.start_time), 'HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">
                      {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Active'}
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
                        <span>{entry.location || entry.plan?.location || '-'}</span>
                        {entry.latitude && entry.longitude && (
                          <a 
                            href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1 font-bold"
                            onClick={e => e.stopPropagation()}
                          >
                            <MapPin className="w-3 h-3" /> Mission Coordinates
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        entry.is_verified ? "bg-emerald-100/50 text-emerald-600" : "bg-orange-100/50 text-orange-600"
                      )}>
                        {entry.is_verified ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onToggleStatus && canAdd && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-lg",
                              entry.is_verified 
                                ? "bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600" 
                                : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600"
                            )}
                            title={entry.is_verified ? "Mark as Pending" : "Approve Log"}
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
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    No time entries found
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
              Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + (paginatedEntries.length > 0 ? 1 : 0)}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredEntries.length)}</span> of <span className="text-slate-900">{filteredEntries.length}</span> results
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
