'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Calendar as CalendarIcon, MapPin, MoreHorizontal, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { Plan } from '@/lib/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePlans } from '@/hooks/plans/usePlans'
import { cn } from '@/lib/utils'

// ─── Animated Status Badge ────────────────────────────────────────────────────
function StatusBadge({ status, isUpdating }: { status: string; isUpdating?: boolean }) {
  const [prev, setPrev] = useState(status)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (status !== prev) {
      setAnimating(true)
      const t = setTimeout(() => { setPrev(status); setAnimating(false) }, 300)
      return () => clearTimeout(t)
    }
  }, [status, prev])

  const styles: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600 border-gray-200',
    assigned:  'bg-blue-100 text-[#0064E0] border-blue-200',
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-100 text-red-600 border-red-200',
    cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300',
      animating ? 'scale-110 opacity-0' : 'scale-100 opacity-100',
      styles[status] || styles.draft
    )}>
      {isUpdating ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Updating...</>
      ) : status}
    </span>
  )
}

// ─── Row Skeleton ─────────────────────────────────────────────────────────────
function PlanRowSkeleton() {
  return (
    <tr className="border-b border-gray-50">
      {[1,2,3,4,5].map(i => (
        <td key={i} className="p-6">
          <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-24" />
        </td>
      ))}
    </tr>
  )
}

// ─── Inline Confirm ───────────────────────────────────────────────────────────
function InlineConfirm({ onConfirm, onCancel, label = 'Cancel Shift' }: {
  onConfirm: () => void
  onCancel: () => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-150">
      <span className="text-xs font-bold text-gray-500">Sure?</span>
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-colors"
      >
        Yes
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
      >
        No
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { plans, loading, updatePlanStatus, deletePlan } = usePlans()

  const handleStatusUpdate = async (id: string, status: Plan['status'], reason?: string) => {
    setUpdatingId(id)
    try {
      await updatePlanStatus(id, status, reason)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredPlans = plans.filter(p =>
    p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Admin / Dispatcher View ───────────────────────────────────────────────
  if (isAdmin || isDispatcher) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-gray-900">
              {locale === 'en' ? 'Shift Planning' : 'Einsatzplanung'}
            </h2>
            <p className="text-muted-foreground font-medium">Create and manage assignments for your team.</p>
          </div>
          <Link href="/dashboard/plans/new">
            <Button className="h-12 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20 gap-2">
              <Plus className="w-5 h-5" />
              {locale === 'en' ? 'New Plan' : 'Neuer Plan'}
            </Button>
          </Link>
        </div>

        <Card className="border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-gray-100 bg-gray-50/50">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'en' ? 'Search employees or routes...' : 'Mitarbeiter oder Routen suchen...'}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Employee', 'Location', 'Date & Time', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} className={cn(
                        "p-6 text-[10px] font-black uppercase tracking-widest text-gray-400",
                        i === 4 ? "text-right" : "text-left"
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => <PlanRowSkeleton key={i} />)
                    : filteredPlans.length === 0
                    ? (
                      <tr>
                        <td colSpan={5} className="p-16 text-center text-gray-400 font-medium">
                          No plans found.
                        </td>
                      </tr>
                    )
                    : filteredPlans.map((plan, index) => (
                      <tr
                        key={plan.id}
                        className={cn(
                          'transition-all duration-300 hover:bg-gray-50/50 animate-in fade-in slide-in-from-bottom-1',
                          (plan as any)._deleting && 'opacity-0 scale-95 pointer-events-none',
                          (plan as any)._loading && 'opacity-50'
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden bg-gray-100 flex-shrink-0">
                              <img
                                src={plan.employee?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.employee?.full_name || 'U')}&background=0064E0&color=fff`}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{plan.employee?.full_name || 'Unassigned'}</p>
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{plan.employee?.role || 'User'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {plan.location || '—'}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                              <CalendarIcon className="w-4 h-4 text-primary" />
                              {new Date(plan.start_time).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(plan.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <StatusBadge
                            status={plan.status}
                            isUpdating={(plan as any)._updating || updatingId === plan.id}
                          />
                        </td>
                        <td className="p-6 text-right">
                          {confirmingId === plan.id ? (
                            <InlineConfirm
                              onConfirm={() => { deletePlan(plan.id); setConfirmingId(null) }}
                              onCancel={() => setConfirmingId(null)}
                            />
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100">
                                  <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-48">
                                <DropdownMenuItem
                                  className="rounded-xl font-bold text-sm gap-2 py-3 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => setConfirmingId(plan.id)}
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  {locale === 'en' ? 'Cancel Shift' : 'Schicht stornieren'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Employee View ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="px-4 pt-4">
        <h2 className="text-3xl font-black tracking-tight text-gray-900">
          {locale === 'en' ? 'My Schedule' : 'Mein Arbeitsplan'}
        </h2>
        <p className="text-muted-foreground font-medium">Your upcoming assignments and routes.</p>
      </div>

      <div className="space-y-4 px-4">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-50 rounded-[2rem] animate-pulse" />
          ))
          : filteredPlans.length === 0
          ? (
            <div className="text-center py-20 text-gray-400 font-medium">
              {locale === 'en' ? 'No assignments found.' : 'Keine Zuweisungen gefunden.'}
            </div>
          )
          : filteredPlans.map((plan, index) => (
            <Card
              key={plan.id}
              className={cn(
                'border-none shadow-sm rounded-[2rem] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
                (plan as any)._deleting && 'opacity-0 scale-95 pointer-events-none'
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-2">
                    <StatusBadge status={plan.status} isUpdating={(plan as any)._updating} />
                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                      {plan.location || 'Assigned Site'}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <CalendarIcon className="w-6 h-6 text-[#0064E0]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-400">Date</span>
                    <p className="font-bold text-gray-900">
                      {new Date(plan.start_time).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', { day: 'numeric', month: 'short', weekday: 'short' })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-400">Time</span>
                    <p className="font-bold text-gray-900 tabular-nums">
                      {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(plan.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {plan.status === 'assigned' && (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-sm shadow-md disabled:opacity-60"
                      disabled={(plan as any)._updating || updatingId === plan.id}
                      onClick={() => handleStatusUpdate(plan.id, 'confirmed')}
                    >
                      {updatingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (locale === 'en' ? 'Accept' : 'Bestätigen')}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl border-gray-200 font-bold text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                      disabled={(plan as any)._updating || updatingId === plan.id}
                      onClick={() => handleStatusUpdate(plan.id, 'rejected')}
                    >
                      {locale === 'en' ? 'Reject' : 'Ablehnen'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  )
}
